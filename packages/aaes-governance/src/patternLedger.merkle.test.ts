import { describe, expect, it } from 'vitest';

import { PatternLedger } from './patternLedger.js';

describe('PatternLedger Merkle chain', () => {
  it('chain_hash links each entry to the previous', () => {
    const ledger = new PatternLedger();
    const first = ledger.append({
      envelope_id: 'env-1',
      trace_id: 'trace-1',
      delta_hash: 'abc',
      actor_id: 'actor-1',
      action: 'ROUTE_CHAT',
    });
    const second = ledger.append({
      envelope_id: 'env-2',
      trace_id: 'trace-2',
      delta_hash: 'def',
      actor_id: 'actor-1',
      action: 'PLAN_STEP',
    });

    expect(first.prev_chain_hash).toBe('0'.repeat(64));
    expect(second.prev_chain_hash).toBe(first.chain_hash);
    expect(first.entry_hash).toHaveLength(64);
    expect(second.chain_hash).toHaveLength(64);
  });

  it('verify() returns valid on unmodified chain', () => {
    const ledger = new PatternLedger();
    ledger.append({
      envelope_id: 'env-1',
      trace_id: 'trace-1',
      delta_hash: 'abc',
      actor_id: 'actor-1',
      action: 'QUERY_STATUS',
    });
    ledger.append({
      envelope_id: 'env-2',
      trace_id: 'trace-2',
      delta_hash: 'def',
      actor_id: 'actor-1',
      action: 'ROUTE_CHAT',
    });

    expect(ledger.verify()).toEqual({ valid: true });
  });

  it('verify() returns invalid if any entry is tampered with', () => {
    const ledger = new PatternLedger();
    ledger.append({
      envelope_id: 'env-1',
      trace_id: 'trace-1',
      delta_hash: 'abc',
      actor_id: 'actor-1',
      action: 'QUERY_STATUS',
    });
    ledger.append({
      envelope_id: 'env-2',
      trace_id: 'trace-2',
      delta_hash: 'def',
      actor_id: 'actor-1',
      action: 'ROUTE_CHAT',
    });

    const entries = ledger.getEntries();
    expect(entries).toHaveLength(2);

    (ledger as unknown as { entries: typeof entries }).entries[0]!.entry_hash =
      '0'.repeat(64);

    expect(ledger.verify()).toEqual({ valid: false, failedAtIndex: 0 });
  });

  it('classifyVerdict() returns correct VerdictClass for each action prefix', () => {
    const ledger = new PatternLedger();

    expect(ledger.classifyVerdict('READ_LEDGER')).toBe('INFORMATIONAL');
    expect(ledger.classifyVerdict('QUERY_STATUS')).toBe('INFORMATIONAL');
    expect(ledger.classifyVerdict('ROUTE_CHAT')).toBe('OPERATIONAL');
    expect(ledger.classifyVerdict('PLAN_STEP')).toBe('OPERATIONAL');
    expect(ledger.classifyVerdict('APPLY_PATCH')).toBe('CONSEQUENTIAL');
    expect(ledger.classifyVerdict('MUTATE_STATE')).toBe('CONSEQUENTIAL');
    expect(ledger.classifyVerdict('REVOKE_FEDERATION')).toBe('IRREVERSIBLE');
    expect(ledger.classifyVerdict('FEDERATE_INITIATE')).toBe('IRREVERSIBLE');
    expect(ledger.classifyVerdict('UNKNOWN_ACTION')).toBe('OPERATIONAL');
  });
});
