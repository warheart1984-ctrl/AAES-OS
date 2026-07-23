import { describe, expect, it } from 'vitest';

import {
  buildCanonicalLineageSnapshot,
  buildSiblingRepoEvidenceInheritance,
  CCR_AAES_OS_SIBLING_REPO_DISCOVERY,
  ensureSiblingRepoEvidence,
} from '../../release/sibling-evidence-inheritance.ts';

describe('CCR-AAES-OS-SiblingRepoDiscovery', () => {
  it('inherits sibling aggregate evidence and project-infi canonical lineage', () => {
    const index = ensureSiblingRepoEvidence({ write: false });
    const inheritance = buildSiblingRepoEvidenceInheritance(index);

    expect(inheritance?.ccrId).toBe(CCR_AAES_OS_SIBLING_REPO_DISCOVERY);
    expect(inheritance?.inherited).toBe(true);
    expect(inheritance?.authority.value).toBe(index.aggregateHash);
    expect(inheritance?.inheritedFields.siblingSummary.declared).toBe(index.summary.declared);
    expect(inheritance?.inheritedFields.adapterContracts).toBeNull();
    expect(inheritance?.inheritedFields.runtimeFederation).toBeNull();
    expect(inheritance?.connectionLadder[0]).toBe('discovery-registry');
    expect(inheritance?.connectionLadder.at(-1)).toBe('runtime-federation');

    const lineage = buildCanonicalLineageSnapshot(index);
    expect(lineage?.siblingId).toBe('project-infi');
    expect(lineage?.path).toContain('project-infi');
    expect(lineage?.truthBoundary).toMatch(/does not automatically raise/i);
  });
});
