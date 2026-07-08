export type LedgerActor = 'governance' | 'runtime' | 'agent' | 'substrate';

export interface LedgerEntry {
  id: string;
  parentHash: string;
  timestamp: number;
  actor: LedgerActor;
  action: string;
  payload: unknown;
  hash: string;
}

export type LedgerEntryInput = Omit<LedgerEntry, 'hash'>;

export const LEDGER_GENESIS_HASH = '0'.repeat(64);
