import { describe, expect, it } from 'vitest';

import { createEvidenceReceipt } from './index.js';
import { ReceiptStore } from './ReceiptStore.js';

describe('ReceiptStore', () => {
  it('stores immutable receipt envelopes and returns the latest by issuedAt', () => {
    const store = new ReceiptStore();

    const first = createEvidenceReceipt({
      claimLabel: 'runtime-run-completed',
      subsystem: 'ucr-runtime',
      evidenceRefs: ['run:one', 'status:completed'],
      subject: { runId: 'run-one' },
      issuedAt: '2026-07-07T10:00:00.000Z',
      kind: 'runtime',
    });
    const second = createEvidenceReceipt({
      claimLabel: 'runtime-run-failed',
      subsystem: 'ucr-runtime',
      evidenceRefs: ['run:two', 'status:failed'],
      subject: { runId: 'run-two' },
      issuedAt: '2026-07-07T11:00:00.000Z',
      kind: 'runtime',
    });

    const firstStored = store.add(first);
    const secondStored = store.add(second);

    expect(firstStored).toMatchObject({
      id: first.receiptId,
      timestamp: first.issuedAt,
      claimLabel: first.claimLabel,
    });
    expect(secondStored).toMatchObject({
      id: second.receiptId,
      timestamp: second.issuedAt,
      claimLabel: second.claimLabel,
    });

    const latest = store.getLatest();
    expect(latest).toMatchObject({
      id: second.receiptId,
      timestamp: second.issuedAt,
    });
    expect(store.list().map((receipt) => receipt.id)).toEqual([first.receiptId, second.receiptId]);
    expect(store.getById(first.receiptId)).toMatchObject({
      claimLabel: first.claimLabel,
      timestamp: first.issuedAt,
    });
  });

  it('falls back to proposalHash or a random id when no receipt id is present', () => {
    const store = new ReceiptStore();
    const stored = store.add({
      proposalHash: 'proposal:abc',
      issuedAt: '2026-07-07T12:00:00.000Z',
      payload: { ok: true },
    });

    expect(stored.id).toBe('proposal:abc');
    expect(store.getLatest()).toMatchObject({
      id: 'proposal:abc',
      timestamp: '2026-07-07T12:00:00.000Z',
    });
  });
});
