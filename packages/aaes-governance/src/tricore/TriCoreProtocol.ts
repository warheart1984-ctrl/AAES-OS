import { randomUUID } from 'node:crypto';

import type { GovernanceContext } from '../context/GovernanceContext.js';

import type {
  TriCoreActor,
  TriCoreMessage,
  TriCoreMessageInput,
  TriCoreRoutingDecision,
} from './messages.js';

export interface TriCoreProtocolOptions {
  freezeActive?: boolean;
}

export class TriCoreProtocol {
  constructor(private readonly options: TriCoreProtocolOptions = {}) {}

  createMessage<TPayload>(input: TriCoreMessageInput<TPayload>): TriCoreMessage<TPayload> {
    return {
      id: input.id ?? randomUUID(),
      from: input.from,
      to: input.to,
      type: input.type,
      payload: input.payload,
      timestamp: input.timestamp ?? Date.now(),
      correlationId: input.correlationId,
      parentId: input.parentId,
      traceId: input.traceId,
    };
  }

  validate<TPayload>(message: TriCoreMessage<TPayload>): TriCoreRoutingDecision {
    if (!message.id || !message.from || !message.to || !message.type) {
      return { allowed: false, reason: 'Message is missing required routing fields' };
    }

    if (this.options.freezeActive && message.type !== 'SUBSTRATE_SIGNAL') {
      return { allowed: false, reason: 'Constitutional freeze blocks non-substrate traffic' };
    }

    return { allowed: true };
  }

  canRoute<TPayload>(message: TriCoreMessage<TPayload>): boolean {
    return this.validate(message).allowed;
  }

  isSubstrateMessage(message: Pick<TriCoreMessage, 'from' | 'to' | 'type'>): boolean {
    return message.from === 'substrate' || message.to === 'substrate' || message.type === 'SUBSTRATE_SIGNAL';
  }

  bindFreeze(freezeActive: boolean): TriCoreProtocol {
    return new TriCoreProtocol({ freezeActive });
  }

  toGovernanceContext<TPayload>(message: TriCoreMessage<TPayload>): GovernanceContext {
    return {
      id: message.id,
      actor: message.from,
      action: message.type,
      payload: message.payload,
      timestamp: message.timestamp,
      metadata: {
        correlationId: message.correlationId,
        parentId: message.parentId,
        traceId: message.traceId,
      },
    };
  }

  routeTarget(actor: TriCoreActor): TriCoreActor {
    return actor;
  }
}
