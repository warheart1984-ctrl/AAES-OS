import { describe, expect, it } from 'vitest';
import { PatchLedger } from './patchLedger.js';

describe('PatchLedger', () => {
  it('approves and deploys patches', () => {
    const ledger = new PatchLedger();
    const p = ledger.propose({
      id: 'PATCH_TEST_001',
      title: 'Test',
      description: 'd',
      proposedBy: 'EXECUTION_CORE',
      targetInvariant: 'INV_OUTPUT_SHAPE',
      targetModule: 'ucr-runtime',
      riskLevel: 'low',
      rollbackPlan: 'revert',
    });
    expect(p.status).toBe('proposed');
    ledger.approve(p.id, 'GOVERNANCE');
    ledger.approve(p.id, 'ARCHITECTURE');
    const deployed = ledger.markDeployed(p.id);
    expect(deployed?.status).toBe('deployed');
    expect(ledger.listDeployed().length).toBe(1);
  });

  it('rejects patches', () => {
    const ledger = new PatchLedger();
    const p = ledger.propose({
      id: 'PATCH_REJECT',
      title: 'R',
      description: 'd',
      proposedBy: 'EXECUTION_CORE',
      targetInvariant: 'INV_DETERMINISM',
      targetModule: 'ucr-runtime',
      riskLevel: 'high',
      rollbackPlan: 'none',
    });
    ledger.reject(p.id, 'GOVERNANCE', 'too risky');
    expect(ledger.get(p.id)?.status).toBe('rejected');
  });
});
