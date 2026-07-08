import type { LedgerEntry } from '../ledger/LedgerEntry.js';
import type { RunLedger } from '../ledger/RunLedger.js';

export type GovernanceActor = 'governance' | 'runtime' | 'agent' | 'substrate';

export interface GovernanceContext {
  id?: string;
  runId?: string;
  spanId?: string;
  actor: GovernanceActor;
  action: string;
  payload: unknown;
  timestamp: number;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  freezeActive?: boolean;
  verified?: boolean;
  approved?: boolean;
  parentHash?: string;
  ledgerEntry?: LedgerEntry;
  ledger?: RunLedger;
}
