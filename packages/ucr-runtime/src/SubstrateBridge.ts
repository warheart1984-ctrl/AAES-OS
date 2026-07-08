import { randomUUID } from 'node:crypto';

import { TriCoreBus, type TriCoreMessage } from '@aaes-os/tri-core-protocol';

export interface SubstrateSignal {
  id: string;
  type: 'entropy' | 'order' | 'governance' | 'memory' | 'interaction';
  payload: unknown;
  timestamp: number;
}

export interface SubstrateBridgeOptions {
  bus?: TriCoreBus;
}

export class SubstrateBridge {
  constructor(private readonly options: SubstrateBridgeOptions = {}) {}

  private get bus(): TriCoreBus {
    return this.options.bus ?? new TriCoreBus();
  }

  listenForSignals(signal: SubstrateSignal): TriCoreMessage | null {
    return this.forwardToGovernance(signal);
  }

  forwardToGovernance(signal: SubstrateSignal): TriCoreMessage | null {
    return this.bus.send({
      id: signal.id || randomUUID(),
      from: 'substrate',
      to: 'governance',
      type: 'SUBSTRATE_SIGNAL',
      payload: signal,
      timestamp: signal.timestamp,
      correlationId: signal.id,
    });
  }

  applyGovernanceCorrection(signal: SubstrateSignal, correction: unknown): TriCoreMessage | null {
    return this.bus.send({
      id: randomUUID(),
      from: 'substrate',
      to: 'runtime',
      type: 'SUBSTRATE_CORRECTION',
      payload: {
        signal,
        correction,
      },
      timestamp: Date.now(),
      correlationId: signal.id,
    });
  }
}
