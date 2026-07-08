import { EventEmitter } from "events";

// TriCore Protocol Types
export type ActorKind = "governance" | "runtime" | "agent";

export interface TriCoreMessageBase {
  id: string;
  from: ActorKind;
  to: ActorKind;
  type: string;
  payload: unknown;
  timestamp: number;
}

export type GovernanceToRuntime = TriCoreMessageBase & { from: "governance"; to: "runtime" };
export type RuntimeToAgent = TriCoreMessageBase & { from: "runtime"; to: "agent" };
export type AgentToRuntime = TriCoreMessageBase & { from: "agent"; to: "runtime" };
export type RuntimeToGovernance = TriCoreMessageBase & { from: "runtime"; to: "governance" };
export type AgentToGovernance = TriCoreMessageBase & { from: "agent"; to: "governance" };

export type TriCoreMessage =
  | GovernanceToRuntime
  | RuntimeToAgent
  | AgentToRuntime
  | RuntimeToGovernance
  | AgentToGovernance;

// TriCoreBus - In-process message bus for governance/runtime/agent communication
export interface TriCoreBus {
  send(message: TriCoreMessage): Promise<void>;
  subscribe(actor: ActorKind, handler: (msg: TriCoreMessage) => void): void;
  unsubscribe(actor: ActorKind, handler: (msg: TriCoreMessage) => void): void;
}

export class InMemoryTriCoreBus extends EventEmitter implements TriCoreBus {
  private subscriptions: Map<ActorKind, Set<(msg: TriCoreMessage) => void>> = new Map();

  async send(message: TriCoreMessage): Promise<void> {
    const handlers = this.subscriptions.get(message.to);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in TriCore handler for ${message.to}:`, error);
        }
      }
    }
    this.emit("message", message);
  }

  subscribe(actor: ActorKind, handler: (msg: TriCoreMessage) => void): void {
    if (!this.subscriptions.has(actor)) {
      this.subscriptions.set(actor, new Set());
    }
    this.subscriptions.get(actor)!.add(handler);
  }

  unsubscribe(actor: ActorKind, handler: (msg: TriCoreMessage) => void): void {
    const handlers = this.subscriptions.get(actor);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}
