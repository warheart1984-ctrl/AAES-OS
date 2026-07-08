export type TriCoreActor = 'governance' | 'runtime' | 'agent' | 'substrate';

export type TriCoreKnownMessageType =
  | 'GOVERNANCE_TO_RUNTIME'
  | 'RUNTIME_TO_AGENT'
  | 'AGENT_TO_RUNTIME'
  | 'RUNTIME_TO_GOVERNANCE'
  | 'AGENT_TO_GOVERNANCE'
  | 'SUBSTRATE_SIGNAL'
  | 'GOVERNANCE_APPROVE'
  | 'GOVERNANCE_DENY'
  | 'ULX_EXEC'
  | 'LLM_OUTPUT'
  | 'LEDGER_APPEND'
  | 'FATAL_INVARIANT'
  | 'SUBSTRATE_CORRECTION';

export type TriCoreMessageType = TriCoreKnownMessageType | (string & {});

export interface TriCoreMessage<TPayload = unknown> {
  id: string;
  from: TriCoreActor;
  to: TriCoreActor;
  type: TriCoreMessageType;
  payload: TPayload;
  timestamp: number;
  correlationId?: string;
  parentId?: string;
  traceId?: string;
}

export interface TriCoreMessageInput<TPayload = unknown>
  extends Omit<TriCoreMessage<TPayload>, 'id' | 'timestamp'> {
  id?: string;
  timestamp?: number;
}

export interface TriCoreRoutingDecision {
  allowed: boolean;
  reason?: string;
}
