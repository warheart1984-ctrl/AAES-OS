import { describe, expect, it } from 'vitest';

import {
  buildSiblingAdapterContractEvidence,
  isAdapterContractEvidenceIndex,
} from '../../tools/sibling-adapter-contracts.ts';

describe('CCR-AAES-OS-SiblingAdapterContracts', () => {
  it('evaluates fail-closed contracts for verified remotes and writes receipts', () => {
    const index = buildSiblingAdapterContractEvidence({ write: false });

    expect(isAdapterContractEvidenceIndex(index)).toBe(true);
    expect(index.failClosed).toBe(true);
    expect(index.summary.declared).toBe(8);
    expect(index.receipts).toHaveLength(8);
    expect(index.deferredFamilies.some((d) => d.family === 'mythar')).toBe(true);

    const projectInfi = index.receipts.find((r) => r.adapterId === 'adapter-project-infi-canonical');
    expect(projectInfi?.verdict).toBe('pass');
    expect(projectInfi?.observedReceipt.receiptHash).toMatch(/^sha256:/);
    expect(projectInfi?.checks.every((c) => c.passed)).toBe(true);

    for (const receipt of index.receipts) {
      expect(receipt.failClosed).toBe(true);
      if (receipt.verdict === 'pass') {
        expect(receipt.blockers).toEqual([]);
      } else {
        expect(receipt.blockers.length).toBeGreaterThan(0);
      }
    }
  });
});
