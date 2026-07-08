import type { RunId, RunRecord, RunSnapshot, SpanId } from '@aaes-os/runledger';
import { RunStore } from '@aaes-os/runledger';
import {
  FAULT_CODE_SPAN_ORPHAN,
  createMinimalInvariantEngine,
  initGovernanceGlobals,
  type FaultEvent,
  type FaultJournal,
  type GovernanceTraceBus,
  type GovernanceTraceEvent,
  type InvariantEngine,
} from '@aaes-os/aaes-governance';
import { ReceiptStore, createEvidenceReceipt } from '@aaes-os/evidence-receipts';
import {
  applyDeployedOutputPatches,
  getPatchLedger,
  seedApprovedPatches,
} from '@aaes-os/tri-core-protocol';
import { TraceBus } from '@aaes-os/trace-bus';

import { withSpanGuard } from './withSpanGuard.js';

export interface RuntimeIntent {
  kind?: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
  runIndex?: number;
}

export interface RuntimeResult {
  runId: RunId;
  output: unknown;
  faults: FaultEvent[];
  status: 'completed' | 'failed';
  spanOrphan?: boolean;
}

export type DemoRunMode = 'good' | 'string' | 'random' | 'throw';

export interface UCRRuntimeOptions {
  runStore?: RunStore;
  receiptStore?: ReceiptStore;
  traceBus?: TraceBus;
  faultJournal?: FaultJournal;
  invariantEngine?: InvariantEngine;
  enablePatches?: boolean;
  demoSchedule?: DemoRunMode[];
  outputMode?: DemoRunMode;
  spanName?: string;
}

const SPAN_NAME = 'runtime-execution';

/** UCRRuntime v0.1 — governed run loop with optional constitutional patches. */
export class UCRRuntime {
  private readonly runStore: RunStore;
  private readonly receiptStore: ReceiptStore;
  private readonly traceBus: TraceBus;
  private readonly faultJournal: FaultJournal;
  private readonly invariantEngine: InvariantEngine;
  private readonly enablePatches: boolean;
  private readonly demoSchedule: DemoRunMode[];
  private readonly spanName: string;
  private runCounter = 0;

  constructor(options: UCRRuntimeOptions = {}) {
    const { journal: globalJournal } = initGovernanceGlobals();
    this.runStore = options.runStore ?? new RunStore();
    this.receiptStore = options.receiptStore ?? new ReceiptStore();
    this.traceBus = options.traceBus ?? new TraceBus();
    const wired = createMinimalInvariantEngine(
      options.faultJournal ?? globalJournal,
      asGovernanceTraceBus(this.traceBus),
    );
    this.faultJournal = wired.journal;
    this.invariantEngine = options.invariantEngine ?? wired.engine;
    this.enablePatches = options.enablePatches ?? false;
    this.spanName = options.spanName ?? SPAN_NAME;
    if (this.enablePatches && !getPatchLedger()) {
      seedApprovedPatches();
    }
    this.demoSchedule = options.demoSchedule ?? (options.outputMode ? [options.outputMode] : []);
  }

  getTraceBus(): TraceBus {
    return this.traceBus;
  }

  getReceiptStore(): ReceiptStore {
    return this.receiptStore;
  }

  async run(intent: RuntimeIntent = {}): Promise<RuntimeResult> {
    const runIndex = intent.runIndex ?? this.runCounter;
    this.runCounter += 1;

    const run = this.runStore.startRun({
      metadata: { kind: intent.kind, ...intent.metadata },
    });
    this.traceBus.runStart(run.runId);

    let spanOrphan = false;
    let output: unknown;
    let executionError: Error | undefined;

    const execute = async (activeSpanId: SpanId): Promise<void> => {
      const raw = await this.executePlan(intent, runIndex);
      output = this.enablePatches ? applyDeployedOutputPatches(raw) : raw;
      await this.invariantEngine.evaluateAll({
        runId: run.runId,
        spanId: activeSpanId,
        input: intent.payload,
        output,
      });
    };

    if (this.enablePatches) {
      try {
        await withSpanGuard(this.runStore, this.traceBus, run.runId, this.spanName, execute);
      } catch (error) {
        executionError = error instanceof Error ? error : new Error(String(error));
      }
    } else {
      const span = this.runStore.startSpan(run.runId, { name: this.spanName });
      this.traceBus.spanStart(run.runId, span.spanId, this.spanName);
      try {
        await execute(span.spanId);
        this.runStore.endSpan(span.spanId);
        this.traceBus.spanEnd(run.runId, span.spanId, this.spanName);
      } catch (error) {
        spanOrphan = true;
        executionError = error instanceof Error ? error : new Error(String(error));
        const fault = this.faultJournal.recordFault({
          runId: run.runId,
          spanId: span.spanId,
          faultCode: FAULT_CODE_SPAN_ORPHAN,
          severity: 'ERROR',
          contextSnapshot: {
            reason: 'span_orphan',
            message: executionError.message,
          },
        });
        this.traceBus.emit({
          type: 'TRACE_FAULT',
          timestamp: fault.timestamp,
          runId: fault.runId,
          spanId: fault.spanId,
          fault,
        });
      }
    }

    const faults = this.faultJournal.getByRun(run.runId);
    const status = faults.length > 0 || spanOrphan || executionError ? 'failed' : 'completed';
    const runRecord = !spanOrphan ? this.runStore.endRun(run.runId) : this.runStore.getRun(run.runId) ?? run;
    const spans = this.runStore.getSpansByRun(run.runId);
    const runSnapshot = this.runStore.getRunSnapshot(run.runId) ?? {
      run: runRecord,
      spans,
      invariantLinks: spans.flatMap((span) => this.runStore.getInvariantLinks(span.spanId)),
    };

    this.traceBus.runEnd(run.runId);
    const receipt = this.writeTerminalReceipt({
      runId: run.runId,
      runRecord,
      runSnapshot,
      status,
      faults,
      output,
      spanOrphan,
      executionError,
    });
    this.traceBus.emit({
      type: 'TRACE_RECEIPT',
      timestamp: String(receipt.timestamp ?? runRecord.endedAt ?? new Date().toISOString()),
      runId: run.runId,
      receipt,
    });

    return {
      runId: run.runId,
      output,
      faults,
      status,
      spanOrphan,
    };
  }

  private async executePlan(intent: RuntimeIntent, runIndex: number): Promise<unknown> {
    const mode = this.resolveMode(runIndex);

    switch (mode) {
      case 'string':
        return `bad-output-${runIndex}`;
      case 'random':
        return {
          echo: intent.payload,
          rand: Math.random(),
          ts: Date.now(),
        };
      case 'throw':
        throw new Error('demo throw');
      default:
        return { echo: intent.payload };
    }
  }

  private resolveMode(runIndex: number): DemoRunMode {
    if (this.demoSchedule.length > 0) {
      return this.demoSchedule[runIndex % this.demoSchedule.length] ?? 'good';
    }
    return 'good';
  }

  private writeTerminalReceipt(input: {
    runId: RunId;
    runRecord: RunRecord;
    runSnapshot: RunSnapshot;
    status: RuntimeResult['status'];
    faults: FaultEvent[];
    output: unknown;
    spanOrphan: boolean;
    executionError?: Error;
  }): Record<string, unknown> {
    const receipt = createEvidenceReceipt({
      claimLabel: input.status === 'completed' ? 'runtime-run-completed' : 'runtime-run-failed',
      subsystem: 'ucr-runtime',
      evidenceRefs: [
        `run:${input.runId}`,
        `status:${input.status}`,
        `faults:${input.faults.length}`,
        `span-orphan:${input.spanOrphan ? 'yes' : 'no'}`,
      ],
      subject: {
        runId: input.runId,
        status: input.status,
        spanOrphan: input.spanOrphan,
        spanCount: input.runSnapshot.spans.length,
        openSpanCount: input.runSnapshot.spans.filter((span) => !span.endedAt).length,
        invariantLinkCount: input.runSnapshot.invariantLinks.length,
        faultCodes: input.faults.map((fault) => fault.faultCode),
        output: input.output,
        runStartedAt: input.runRecord.startedAt,
        runEndedAt: input.runRecord.endedAt,
        runMetadata: input.runSnapshot.run.metadata,
        spanNames: input.runSnapshot.spans.map((span) => span.name),
        executionError: input.executionError?.message,
      },
      kind: 'runtime',
      issuedAt: input.runRecord.endedAt ?? new Date().toISOString(),
    });

    return this.receiptStore.add(receipt as unknown as Record<string, unknown>);
  }
}

/** Alias retained for integration tests and demos. */
export const DefaultUCRRuntime = UCRRuntime;

function asGovernanceTraceBus(traceBus: TraceBus): GovernanceTraceBus {
  return {
    emit(event: GovernanceTraceEvent): void {
      traceBus.emit(event);
    },
    subscribe(listener: (event: GovernanceTraceEvent) => void): () => void {
      return traceBus.subscribe((event) => {
        if ((event.type === 'TRACE_INVARIANT' || event.type === 'TRACE_FAULT') && event.spanId) {
          listener(event as GovernanceTraceEvent);
        }
      });
    },
  };
}
