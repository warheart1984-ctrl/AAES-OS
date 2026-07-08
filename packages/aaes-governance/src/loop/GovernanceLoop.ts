import { randomUUID } from 'node:crypto';

import type { GovernanceContext } from '../context/GovernanceContext.js';
import type { FaultJournalStore } from '../faults/FaultJournalStore.js';
import { ConstitutionalFreeze } from '../freeze/ConstitutionalFreeze.js';
import type { RunLedger } from '../ledger/RunLedger.js';
import type { InvariantEngine, InvariantResult } from '../invariants/index.js';
import { TriCoreProtocol } from '../tricore/TriCoreProtocol.js';
import type { TriCoreMessage } from '../tricore/messages.js';
import type { SubstrateSignal } from '../substrate/SubstrateSignal.js';

export interface GovernanceLoopOptions {
  tickIntervalMs?: number;
  bus?: {
    send(message: TriCoreMessage): void | Promise<void>;
    setFrozen?(frozen: boolean): void;
  };
  protocol?: TriCoreProtocol;
  freeze?: ConstitutionalFreeze;
}

function cloneContext(context: GovernanceContext): GovernanceContext {
  return structuredClone(context);
}

function highestSeverity(results: InvariantResult[]): InvariantResult['severity'] {
  if (results.some((result) => result.severity === 'fatal')) {
    return 'fatal';
  }
  if (results.some((result) => result.severity === 'error')) {
    return 'error';
  }
  if (results.some((result) => result.severity === 'warn')) {
    return 'warn';
  }
  return 'info';
}

function isSubstrateCorrection(context: GovernanceContext): boolean {
  if (context.actor !== 'substrate') {
    return false;
  }
  const payload =
    context.payload && typeof context.payload === 'object' && !Array.isArray(context.payload)
      ? (context.payload as Record<string, unknown>)
      : {};
  return (
    context.action === 'SUBSTRATE_CORRECTION' ||
    payload.correction === true ||
    payload.type === 'SUBSTRATE_CORRECTION'
  );
}

export class GovernanceLoop {
  private readonly queue: GovernanceContext[] = [];
  private readonly substrateSignals: SubstrateSignal[] = [];
  private readonly tickIntervalMs: number;
  private readonly protocol: TriCoreProtocol;
  private readonly freezeState: ConstitutionalFreeze;
  private timer?: NodeJS.Timeout;
  private active = false;

  constructor(
    private readonly invariantEngine: InvariantEngine,
    private readonly runLedger: RunLedger,
    private readonly faultJournal: FaultJournalStore,
    options: GovernanceLoopOptions = {},
  ) {
    this.tickIntervalMs = options.tickIntervalMs ?? 20;
    this.protocol = options.protocol ?? new TriCoreProtocol();
    this.freezeState = options.freeze ?? new ConstitutionalFreeze();
    this.bus = options.bus;
  }

  private readonly bus?: GovernanceLoopOptions['bus'];

  start(): void {
    if (this.active) {
      return;
    }
    this.active = true;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.tickIntervalMs);
  }

  stop(): void {
    this.active = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  freeze(reason: string): void {
    this.freezeState.freeze(reason);
    this.bus?.setFrozen?.(true);
  }

  unfreeze(): void {
    this.freezeState.unfreeze();
    this.bus?.setFrozen?.(false);
  }

  isFrozen(): boolean {
    return this.freezeState.isFrozen();
  }

  getFreezeReason(): string | undefined {
    return this.freezeState.getReason();
  }

  enqueue(context: GovernanceContext): void {
    this.queue.push(cloneContext(context));
  }

  enqueueSubstrateSignal(signal: SubstrateSignal): void {
    this.substrateSignals.push(structuredClone(signal));
  }

  async tick(): Promise<void> {
    const substrateBatch = this.substrateSignals.splice(0, this.substrateSignals.length);
    for (const signal of substrateBatch) {
      await this.processContext({
        id: signal.id,
        runId: signal.id,
        spanId: signal.id,
        actor: 'substrate',
        action: 'SUBSTRATE_SIGNAL',
        payload: signal,
        timestamp: signal.timestamp,
        metadata: {
          substrateSignalType: signal.type,
        },
        freezeActive: this.isFrozen(),
      });
    }

    const batch = this.queue.splice(0, this.queue.length);
    for (const context of batch) {
      if (this.isFrozen() && !isSubstrateCorrection(context)) {
        continue;
      }
      await this.processContext(context);
    }
  }

  private async processContext(context: GovernanceContext): Promise<void> {
    const normalized: GovernanceContext = {
      id: context.id ?? randomUUID(),
      runId: context.runId,
      spanId: context.spanId,
      actor: context.actor,
      action: context.action,
      payload: context.payload,
      timestamp: context.timestamp,
      input: context.input,
      output: context.output,
      metadata: context.metadata,
      freezeActive: this.isFrozen() || context.freezeActive,
      verified: context.verified,
      approved: context.approved,
      parentHash: context.parentHash ?? this.runLedger.getLatest()?.hash,
      ledgerEntry: context.ledgerEntry,
      ledger: context.ledger ?? this.runLedger,
    };

    const results = await this.invariantEngine.evaluateAll({
      ...normalized,
      runId: normalized.runId ?? normalized.id ?? 'run-unknown',
      spanId: normalized.spanId ?? normalized.id ?? 'span-unknown',
    });
    const finalSeverity = highestSeverity(results);
    const ledgerActor = normalized.actor ?? 'governance';
    const ledgerAction = normalized.action ?? 'inspect';
    const ledgerId = normalized.id ?? randomUUID();
    const ledgerEntry = this.runLedger.append({
      id: ledgerId,
      parentHash: normalized.parentHash ?? this.runLedger.getLatest()?.hash ?? '',
      timestamp: normalized.timestamp,
      actor: ledgerActor,
      action: ledgerAction,
      payload: {
        context: normalized,
        invariantResults: results,
      },
    });

    const payload = {
      approved: results.every((result) => result.passed),
      severity: finalSeverity,
      results,
      ledgerHash: ledgerEntry.hash,
      freezeReason: this.getFreezeReason(),
    };

    if (finalSeverity === 'fatal') {
      const fatalResult = results.find((result) => result.severity === 'fatal');
      const reason = fatalResult?.message ?? 'fatal invariant breach';
      this.freeze(reason);
      this.faultJournal.record({
        invariantId: fatalResult?.invariantId ?? 'I-UNKNOWN',
        severity: 'fatal',
        context: normalized,
        message: reason,
        actor: ledgerActor,
        action: ledgerAction,
        runId: normalized.runId,
        spanId: normalized.spanId,
        faultCode: `INV_FAIL_${fatalResult?.invariantId ?? 'I-UNKNOWN'}`,
        contextSnapshot: normalized,
      });
    }

    if (this.bus) {
      const message = this.protocol.createMessage({
        from: 'governance',
        to: normalized.actor === 'agent' ? 'agent' : 'runtime',
        type: finalSeverity === 'fatal' ? 'GOVERNANCE_DENY' : 'GOVERNANCE_APPROVE',
        payload,
        correlationId: ledgerId,
        traceId: normalized.runId ?? ledgerId,
      });
      if (this.protocol.bindFreeze(this.isFrozen()).canRoute(message)) {
        await this.bus.send(message);
      }
    }
  }
}
