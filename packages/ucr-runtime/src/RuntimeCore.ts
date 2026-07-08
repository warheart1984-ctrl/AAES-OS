import { randomUUID } from 'node:crypto';

import { TriCoreBus, type TriCoreActor, type TriCoreMessage } from '@aaes-os/tri-core-protocol';

export interface RuntimeCoreResult {
  accepted: boolean;
  forwarded: boolean;
  message: TriCoreMessage;
}

export interface RuntimeCoreOptions {
  bus?: TriCoreBus;
  governanceChannel?: TriCoreActor;
}

export class RuntimeCore {
  private readonly bus: TriCoreBus;
  private readonly governanceChannel: TriCoreActor;

  constructor(private readonly options: RuntimeCoreOptions = {}) {
    this.bus = options.bus ?? new TriCoreBus();
    this.governanceChannel = options.governanceChannel ?? 'governance';
  }

  executeUlx(source: string, payload: unknown = {}): RuntimeCoreResult {
    const message = this.bus.send({
      id: randomUUID(),
      from: 'runtime',
      to: this.governanceChannel,
      type: 'ULX_EXEC',
      payload: {
        source,
        ...asRecord(payload),
      },
      timestamp: Date.now(),
    });

    return {
      accepted: true,
      forwarded: message !== null,
      message:
        message ??
        {
          id: randomUUID(),
          from: 'runtime',
          to: 'governance',
          type: 'ULX_EXEC',
          payload: { source, ...asRecord(payload) },
          timestamp: Date.now(),
        },
    };
  }

  forwardToGovernance(type: string, payload: unknown): RuntimeCoreResult {
    const message = this.bus.send({
      id: randomUUID(),
      from: 'runtime',
      to: this.governanceChannel,
      type,
      payload,
      timestamp: Date.now(),
    });

    return {
      accepted: true,
      forwarded: message !== null,
      message:
        message ??
        {
          id: randomUUID(),
          from: 'runtime',
          to: 'governance',
          type,
          payload,
          timestamp: Date.now(),
        },
    };
  }

  handleGovernanceDecision(message: TriCoreMessage): boolean {
    return message.to === 'runtime' && (message.type === 'GOVERNANCE_APPROVE' || message.type === 'GOVERNANCE_DENY');
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
