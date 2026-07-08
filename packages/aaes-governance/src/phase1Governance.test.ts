import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import { FaultJournalStore } from './faults/FaultJournalStore.js';
import { GovernanceLoop } from './loop/GovernanceLoop.js';
import { coreInvariants, registerCoreInvariants } from './invariants/coreInvariants.js';
import { InvariantEngine } from './invariantEngine.js';
import { RunLedger } from './ledger/RunLedger.js';

describe('phase 1 governance core', () => {
  it('records a core invariant fault for unledgered state mutation', async () => {
    const journal = new FaultJournalStore();
    const engine = new InvariantEngine(journal);
    registerCoreInvariants(engine);

    const results = await engine.evaluateAll({
      runId: 'run-1',
      spanId: 'span-1',
      actor: 'agent',
      action: 'mutate_state',
      payload: { mutatesState: true },
      timestamp: Date.now(),
    });

    expect(coreInvariants).toHaveLength(7);
    expect(results.some((result) => result.invariantId === 'I-001' && result.passed === false)).toBe(true);
    expect(journal.getByInvariantId('I-001')).toHaveLength(1);
  });

  it('persists run ledger entries with a parent-hash chain', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'aaes-governance-ledger-'));
    const ledgerPath = join(tempDir, 'run-ledger.jsonl');

    try {
      const ledger = new RunLedger({ storagePath: ledgerPath });
      const first = ledger.append({
        id: 'entry-1',
        parentHash: '',
        timestamp: 1,
        actor: 'governance',
        action: 'bootstrap',
        payload: { step: 1 },
      });
      const second = ledger.append({
        id: 'entry-2',
        parentHash: first.hash,
        timestamp: 2,
        actor: 'runtime',
        action: 'execute',
        payload: { step: 2 },
      });

      expect(first.parentHash).toHaveLength(64);
      expect(second.parentHash).toBe(first.hash);
      expect(ledger.verifyChain().valid).toBe(true);

      const reloaded = new RunLedger({ storagePath: ledgerPath });
      expect(reloaded.getAll()).toHaveLength(2);
      expect(reloaded.verifyChain().valid).toBe(true);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it('records and resolves faults in the fault journal store', () => {
    const journal = new FaultJournalStore();
    const record = journal.record({
      invariantId: 'I-002',
      severity: 'fatal',
      context: { source: 'test' },
      message: 'unverified bytecode',
      faultCode: 'INV_FAIL_I-002',
      runId: 'run-2',
      spanId: 'span-2',
    });

    expect(journal.getByInvariantId('I-002')).toHaveLength(1);
    expect(journal.getByFaultCode('INV_FAIL_I-002')).toHaveLength(1);
    expect(journal.getUnresolved()).toHaveLength(1);

    const resolved = journal.resolve(record.id);
    expect(resolved?.resolved).toBe(true);
  });

  it('freezes on fatal runtime violations and ignores later runtime actions', async () => {
    const journal = new FaultJournalStore();
    const engine = new InvariantEngine(journal);
    registerCoreInvariants(engine);
    const ledger = new RunLedger();
    const bus = { send: vi.fn() };
    const loop = new GovernanceLoop(engine, ledger, journal, { bus, tickIntervalMs: 1 });

    loop.enqueue({
      runId: 'run-freeze',
      spanId: 'span-freeze',
      actor: 'runtime',
      action: 'ulx_exec',
      payload: { verified: false },
      verified: false,
      timestamp: Date.now(),
    });
    await loop.tick();

    expect(loop.isFrozen()).toBe(true);
    expect(journal.getByInvariantId('I-006').length).toBeGreaterThanOrEqual(1);
    expect(ledger.getAll()).toHaveLength(1);

    loop.enqueue({
      runId: 'run-ignored',
      spanId: 'span-ignored',
      actor: 'runtime',
      action: 'runtime_execute',
      payload: { approved: true },
      timestamp: Date.now(),
    });
    await loop.tick();

    expect(ledger.getAll()).toHaveLength(1);
  });
});
