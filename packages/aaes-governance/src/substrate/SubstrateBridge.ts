import { randomUUID } from 'node:crypto';

import type { FaultJournalStore } from '../faults/FaultJournalStore.js';
import { TriCoreProtocol } from '../tricore/TriCoreProtocol.js';
import type { TriCoreMessage } from '../tricore/messages.js';

import type { SubstrateSignal } from './SubstrateSignal.js';

export interface SubstrateBridgeOptions {
  protocol?: TriCoreProtocol;
  bus?: {
    send(message: TriCoreMessage): void | Promise<void>;
  };
  faultJournal?: FaultJournalStore;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export class SubstrateBridge {
  private readonly protocol: TriCoreProtocol;

  constructor(private readonly options: SubstrateBridgeOptions = {}) {
    this.protocol = options.protocol ?? new TriCoreProtocol();
  }

  listenForSignals(signal: SubstrateSignal): TriCoreMessage | null {
    return this.forwardToGovernance(signal);
  }

  forwardToGovernance(signal: SubstrateSignal): TriCoreMessage | null {
    const message = this.protocol.createMessage({
      id: signal.id || randomUUID(),
      from: 'substrate',
      to: 'governance',
      type: 'SUBSTRATE_SIGNAL',
      payload: signal,
      timestamp: signal.timestamp,
      correlationId: signal.id,
    });

    void this.options.bus?.send(message);
    return message;
  }

  applyGovernanceCorrection(signal: SubstrateSignal, correction: unknown): TriCoreMessage | null {
    const message = this.protocol.createMessage({
      id: randomUUID(),
      from: 'substrate',
      to: 'runtime',
      type: 'SUBSTRATE_CORRECTION',
      payload: {
        signal,
        correction,
        loggedInFaultJournal: true,
      },
      timestamp: Date.now(),
      correlationId: signal.id,
    });

    this.options.faultJournal?.record({
      invariantId: 'I-SUB-003',
      severity: 'warn',
      context: {
        signal,
        correction,
      },
      message: 'Substrate correction logged',
      actor: 'substrate',
      action: 'SUBSTRATE_CORRECTION',
    });

    void this.options.bus?.send(message);
    return message;
  }
}

export function isSubstrateSignalPayload(payload: unknown): payload is SubstrateSignal {
  const record = readRecord(payload);
  return (
    typeof record.id === 'string' &&
    (record.type === 'entropy' ||
      record.type === 'order' ||
      record.type === 'governance' ||
      record.type === 'memory' ||
      record.type === 'interaction') &&
    typeof record.timestamp === 'number'
  );
}
