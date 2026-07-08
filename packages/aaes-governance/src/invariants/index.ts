import { asInvariantId, asRunId, asSpanId, type InvariantId } from '@aaes-os/runledger';

import { asFaultId, type FaultEvent } from '../faultTypes.js';
import type { GovernanceContext } from '../context/GovernanceContext.js';
import type { FaultJournalStore } from '../faults/FaultJournalStore.js';
import { registerFreezeInvariants } from '../freeze/FreezeInvariant.js';
import { registerSubstrateInvariants } from '../substrate/SubstrateInvariants.js';
import type { GovernanceTraceBus } from '../tracePort.js';

export type InvariantSeverity = 'info' | 'warn' | 'error' | 'fatal';

export interface InvariantResult {
  passed: boolean;
  severity: InvariantSeverity;
  message?: string;
  details?: unknown;
  invariantId?: string;
}

export interface InvariantContext {
  runId: string;
  spanId: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  actor?: GovernanceContext['actor'];
  action?: string;
  payload?: unknown;
  timestamp?: number;
  freezeActive?: boolean;
  verified?: boolean;
  approved?: boolean;
  parentHash?: string;
  ledgerEntry?: GovernanceContext['ledgerEntry'];
  ledger?: GovernanceContext['ledger'];
}

export interface Invariant {
  id: string;
  description: string;
  name?: string;
  check?: (context: GovernanceContext) => InvariantResult | Promise<InvariantResult>;
  evaluate?: (context: InvariantContext) => InvariantResult | Promise<InvariantResult>;
}

export interface InvariantEngineOptions {
  traceBus?: GovernanceTraceBus;
}

function cloneResult(result: InvariantResult): InvariantResult {
  return structuredClone(result);
}

function normalizeSeverity(severity?: string): InvariantSeverity {
  if (severity === 'fatal' || severity === 'error' || severity === 'warn' || severity === 'info') {
    return severity;
  }
  return 'error';
}

async function invokeInvariant(
  invariant: Invariant,
  context: InvariantContext,
): Promise<InvariantResult> {
  const evaluator =
    (invariant.check ?? invariant.evaluate) as
      | ((context: GovernanceContext) => InvariantResult | Promise<InvariantResult>)
      | undefined;
  if (!evaluator) {
    return {
      passed: true,
      severity: 'info',
      invariantId: invariant.id,
      message: 'No evaluator registered',
    };
  }

  const normalizedContext: GovernanceContext = {
    id: context.runId,
    runId: context.runId,
    spanId: context.spanId,
    actor: context.actor ?? 'governance',
    action: context.action ?? 'inspect',
    payload: context.payload ?? {
      input: context.input,
      output: context.output,
      metadata: context.metadata,
    },
    timestamp: context.timestamp ?? Date.now(),
    input: context.input,
    output: context.output,
    metadata: context.metadata,
    freezeActive: context.freezeActive,
    verified: context.verified,
    approved: context.approved,
    parentHash: context.parentHash,
    ledgerEntry: context.ledgerEntry,
    ledger: context.ledger,
  };

  try {
    const result = await evaluator.call(invariant, normalizedContext);
    return {
      ...result,
      severity: normalizeSeverity(result.severity),
      invariantId: result.invariantId ?? invariant.id,
    };
  } catch (error) {
    return {
      passed: false,
      severity: 'fatal',
      invariantId: invariant.id,
      message: error instanceof Error ? error.message : 'Invariant evaluation failed',
      details: error,
    };
  }
}

function isFaultJournalRecordable(
  journal: unknown,
): journal is {
  recordFault?: (input: {
    runId?: string;
    spanId?: string;
    invariantId?: string;
    faultCode?: string;
    severity: string;
    contextSnapshot?: unknown;
  }) => RecordedFault;
  record?: (input: {
    invariantId: string;
    severity: string;
    context?: unknown;
    message?: string;
    actor?: string;
    action?: string;
  }) => RecordedFault;
} {
  return Boolean(journal && typeof journal === 'object');
}

type RecordedFault = {
  id?: string;
  faultId?: string;
  runId: string;
  spanId: string;
  invariantId?: string;
  timestamp: string | number;
  faultCode?: string;
  severity: string;
  contextSnapshot?: unknown;
  patchApplied?: string;
  recurrenceCount?: number;
};

function normalizeFaultSeverity(severity: string): FaultEvent['severity'] {
  const normalized = severity.toUpperCase();
  if (normalized === 'INFO' || normalized === 'WARN' || normalized === 'ERROR' || normalized === 'CRITICAL') {
    return normalized;
  }
  if (normalized === 'FATAL') {
    return 'CRITICAL';
  }
  return 'ERROR';
}

function toTraceFaultEvent(fault: RecordedFault, fallbackInvariantId: string): FaultEvent {
  const timestamp = typeof fault.timestamp === 'number' ? new Date(fault.timestamp).toISOString() : fault.timestamp;
  const invariantId = fault.invariantId ?? fallbackInvariantId;
  const faultCode = fault.faultCode ?? `INV_FAIL_${invariantId}`;

  return {
    faultId: asFaultId(fault.faultId ?? fault.id ?? `${faultCode}:${fault.runId}:${fault.spanId}`),
    runId: asRunId(fault.runId),
    spanId: asSpanId(fault.spanId),
    invariantId: asInvariantId(invariantId),
    timestamp,
    faultCode,
    severity: normalizeFaultSeverity(fault.severity),
    contextSnapshot: fault.contextSnapshot,
    patchApplied: fault.patchApplied,
    recurrenceCount: fault.recurrenceCount,
  };
}

export class InvariantEngine {
  private readonly invariants = new Map<string, Invariant>();
  private readonly options: InvariantEngineOptions;

  constructor(
    private readonly faultJournal?: FaultJournalStore | unknown,
    optionsOrTraceBus: InvariantEngineOptions | GovernanceTraceBus = {},
  ) {
    if (typeof (optionsOrTraceBus as GovernanceTraceBus).emit === 'function') {
      this.options = { traceBus: optionsOrTraceBus as GovernanceTraceBus };
      return;
    }
    this.options = optionsOrTraceBus as InvariantEngineOptions;
  }

  register(invariant: Invariant): void {
    this.invariants.set(invariant.id, invariant);
  }

  unregister(invariantId: string): void {
    this.invariants.delete(invariantId);
  }

  get(invariantId: string): Invariant | undefined {
    return this.invariants.get(invariantId);
  }

  list(): Invariant[] {
    return [...this.invariants.values()];
  }

  evaluate(_context: InvariantContext): InvariantResult[] {
    return this.list().map((invariant) => ({
      passed: true,
      severity: 'info',
      invariantId: invariant.id,
      message: 'Deferred to evaluateAll for async support',
    }));
  }

  async evaluateAll(context: InvariantContext): Promise<InvariantResult[]> {
    const results: InvariantResult[] = [];
    const traceRunId = asRunId(context.runId);
    const traceSpanId = asSpanId(context.spanId);

    for (const invariant of this.list()) {
      const result = await invokeInvariant(invariant, context);
      results.push(cloneResult(result));

      if (this.options.traceBus) {
        this.options.traceBus.emit({
          type: 'TRACE_INVARIANT',
          timestamp: new Date().toISOString(),
          runId: traceRunId,
          spanId: traceSpanId,
          invariantId: asInvariantId(invariant.id) as InvariantId,
          passed: result.passed,
          message: result.message,
        });
      }

      if (!result.passed && isFaultJournalRecordable(this.faultJournal)) {
        const faultCode = `INV_FAIL_${invariant.id}`;
        let recordedFault: RecordedFault | undefined;

        if (typeof this.faultJournal.recordFault === 'function') {
          recordedFault = this.faultJournal.recordFault({
            runId: context.runId,
            spanId: context.spanId,
            invariantId: invariant.id,
            faultCode,
            severity: result.severity.toUpperCase(),
            contextSnapshot: {
              input: context.input,
              output: context.output,
              payload: context.payload,
              metadata: context.metadata,
              details: result.details,
              message: result.message,
            },
          }) as RecordedFault;
        } else if (typeof this.faultJournal.record === 'function') {
          recordedFault = this.faultJournal.record({
            invariantId: invariant.id,
            severity: result.severity,
            context,
            message: result.message,
            actor: context.actor,
            action: context.action,
          }) as RecordedFault;
        }

        if (recordedFault && this.options.traceBus) {
          const fault = toTraceFaultEvent(recordedFault, invariant.id);
          this.options.traceBus.emit({
            type: 'TRACE_FAULT',
            timestamp: fault.timestamp,
            runId: fault.runId,
            spanId: fault.spanId,
            fault,
          });
        }
      }
    }

    return results;
  }

  async evaluateById(invariantId: string, context: InvariantContext): Promise<InvariantResult | null> {
    const invariant = this.invariants.get(invariantId);
    if (!invariant) {
      return null;
    }
    return invokeInvariant(invariant, context);
  }
}

export async function evaluateInvariant(
  invariant: Invariant,
  context: InvariantContext,
): Promise<InvariantResult> {
  return invokeInvariant(invariant, context);
}

import { coreInvariants, registerCoreInvariants } from './coreInvariants.js';

export { GovernanceContext };
export { coreInvariants, registerCoreInvariants };
export { freezeInvariant, freezeInvariants, registerFreezeInvariants } from '../freeze/FreezeInvariant.js';
export { substrateInvariants, registerSubstrateInvariants } from '../substrate/SubstrateInvariants.js';

export function registerGovernanceInvariants(engine: { register(invariant: Invariant): void }): void {
  registerCoreInvariants(engine);
  registerFreezeInvariants(engine.register.bind(engine));
  registerSubstrateInvariants(engine.register.bind(engine));
}
