import { createHash } from 'node:crypto';

import type { FaultEvent } from './faultTypes.js';
import type { VerdictClass } from './verdict.js';

export interface PatternLedgerEntryInput {
  envelope_id: string;
  trace_id: string;
  delta_hash: string;
  constraint_ids?: string[];
  verdict_class?: VerdictClass;
  actor_id: string;
  action: string;
  meta?: Record<string, unknown>;
}

export interface PatternLedgerEntry extends PatternLedgerEntryInput {
  entry_id: string;
  timestamp_iso: string;
  entry_hash: string;
  chain_hash: string;
  prev_chain_hash: string;
  verdict_class: VerdictClass;
}

export interface PatternRecord {
  patternId: string;
  faultCodes: string[];
  invariantIds?: string[];
  recurrence: number;
  firstSeenAt: string;
  lastSeenAt: string;
  associatedPatches?: string[];
  effectivenessScore?: number;
}

const GENESIS_CHAIN_HASH = '0'.repeat(64);

/** PatternLedger — clusters recurring faults by code + invariant. */
export class PatternLedger {
  private readonly patterns = new Map<string, PatternRecord>();
  private readonly entries: PatternLedgerEntry[] = [];
  private lastChainHash = GENESIS_CHAIN_HASH;
  private entryCount = 0;

  append(entry: PatternLedgerEntryInput): PatternLedgerEntry {
    const timestamp_iso = new Date().toISOString();
    const entry_id = `entry_${++this.entryCount}_${Date.now()}`;
    const verdict_class = entry.verdict_class ?? this.classifyVerdict(entry.action);

    const entryPayload = JSON.stringify({
      entry_id,
      timestamp_iso,
      envelope_id: entry.envelope_id,
      trace_id: entry.trace_id,
      delta_hash: entry.delta_hash,
      constraint_ids: entry.constraint_ids ?? [],
      verdict_class,
      actor_id: entry.actor_id,
      action: entry.action,
    });
    const entry_hash = createHash('sha256').update(entryPayload).digest('hex');

    const prev_chain_hash = this.lastChainHash;
    const chain_hash = createHash('sha256')
      .update(entry_hash + prev_chain_hash)
      .digest('hex');
    this.lastChainHash = chain_hash;

    const sealed: PatternLedgerEntry = {
      ...entry,
      entry_id,
      timestamp_iso,
      entry_hash,
      chain_hash,
      prev_chain_hash,
      verdict_class,
    };

    this.entries.push(sealed);
    return sealed;
  }

  verify(): { valid: boolean; failedAtIndex?: number } {
    let prev = GENESIS_CHAIN_HASH;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]!;
      const recomputed = createHash('sha256')
        .update(entry.entry_hash + prev)
        .digest('hex');
      if (recomputed !== entry.chain_hash) {
        return { valid: false, failedAtIndex: i };
      }
      prev = entry.chain_hash;
    }
    return { valid: true };
  }

  getEntries(): readonly PatternLedgerEntry[] {
    return [...this.entries];
  }

  classifyVerdict(action: string): VerdictClass {
    if (action.startsWith('READ') || action.startsWith('QUERY')) {
      return 'INFORMATIONAL';
    }
    if (action.startsWith('ROUTE') || action.startsWith('PLAN')) {
      return 'OPERATIONAL';
    }
    if (action.startsWith('APPLY') || action.startsWith('MUTATE')) {
      return 'CONSEQUENTIAL';
    }
    if (action.startsWith('REVOKE') || action.startsWith('FEDERATE')) {
      return 'IRREVERSIBLE';
    }
    return 'OPERATIONAL';
  }

  ingestFault(event: FaultEvent): void {
    const key = this.buildKey(event.faultCode, event.invariantId);
    const existing = this.patterns.get(key);

    if (!existing) {
      const record: PatternRecord = {
        patternId: key,
        faultCodes: [event.faultCode],
        invariantIds: event.invariantId ? [event.invariantId] : [],
        recurrence: 1,
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
      };
      this.patterns.set(key, record);
      return;
    }

    existing.recurrence += 1;
    existing.lastSeenAt = event.timestamp;
    this.patterns.set(key, existing);
  }

  getAll(): PatternRecord[] {
    return [...this.patterns.values()];
  }

  getTopRecurring(limit = 10): PatternRecord[] {
    return this.getAll()
      .sort((a, b) => b.recurrence - a.recurrence)
      .slice(0, limit);
  }

  private buildKey(faultCode: string, invariantId?: string): string {
    return invariantId ? `${faultCode}::${invariantId}` : faultCode;
  }
}
