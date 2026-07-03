import { describe, expect, it } from 'vitest';

import { LocalPlatform } from './index.js';

describe('LocalPlatform', () => {
  it('creates platform, mesh, psom, and sgce', () => {
    const local = new LocalPlatform({ governanceProfile: 'balanced' });
    expect(local.platform.listProfiles()).toHaveLength(3);
    expect(local.mesh.discover().length).toBeGreaterThan(0);
    expect(local.psom.topology().nodes.length).toBeGreaterThan(0);
    expect(local.sgce.marketplace.search()).toEqual([]);
  });
});
