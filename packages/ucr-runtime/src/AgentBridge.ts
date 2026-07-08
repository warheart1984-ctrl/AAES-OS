import { randomUUID } from 'node:crypto';

import { TriCoreBus, type TriCoreMessage } from '@aaes-os/tri-core-protocol';

export interface AgentAction {
  agentId: string;
  action: string;
  payload?: unknown;
}

export interface AgentBridgeOptions {
  bus?: TriCoreBus;
}

export class AgentBridge {
  constructor(private readonly options: AgentBridgeOptions = {}) {}

  private get bus(): TriCoreBus {
    return this.options.bus ?? new TriCoreBus();
  }

  wrapAction(action: AgentAction): TriCoreMessage {
    return {
      id: randomUUID(),
      from: 'agent',
      to: 'runtime',
      type: 'AGENT_ACT',
      payload: action,
      timestamp: Date.now(),
      correlationId: action.agentId,
    };
  }

  sendAction(action: AgentAction): TriCoreMessage | null {
    return this.bus.send(this.wrapAction(action));
  }
}
