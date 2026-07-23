import { describe, expect, it } from 'vitest';

import {
  buildSiblingRepoEvidence,
  isSiblingRepoEvidenceIndex,
} from '../../tools/sibling-repo-evidence.ts';

describe('sibling-repo evidence', () => {
  it('probes the curated registry and writes a typed evidence index', () => {
    const index = buildSiblingRepoEvidence({ write: false });

    expect(isSiblingRepoEvidenceIndex(index)).toBe(true);
    expect(index.summary.declared).toBeGreaterThan(0);
    expect(index.observations.some((o) => o.id === 'project-infi')).toBe(true);

    const hubClone = index.observations.find((o) => o.path.includes('AAES-OS-clone'));
    // hub itself is not in siblings list; project-infi should be present/partial/verified
    const projectInfi = index.observations.find((o) => o.id === 'project-infi');
    expect(projectInfi?.observed.exists).toBe(true);
    expect(hubClone).toBeUndefined();
    expect(['verified', 'partial', 'missing']).toContain(projectInfi?.status);
  });

  it('rejects malformed packets', () => {
    expect(
      isSiblingRepoEvidenceIndex({
        status: 'verified',
        observations: [{ id: 'x' }],
      }),
    ).toBe(false);
  });
});
