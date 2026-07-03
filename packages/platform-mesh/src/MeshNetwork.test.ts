import { PatternLedger } from '@aaes-os/aaes-governance';
import { AuthorityLevel, SovrenAuthority } from '@aaes-os/sovren';
import { describe, expect, it } from 'vitest';

import { MeshNetwork } from './MeshNetwork.js';

const LAW_KEY = 'mesh-test-law-key';
const LAW_HASH = 'law-hash-v1';

describe('MeshNetwork', () => {
  it('discovers and connects organisms', () => {
    const ledger = new PatternLedger();
    const sovren = new SovrenAuthority(LAW_KEY);
    const mesh = new MeshNetwork('node-a', LAW_HASH, sovren, ledger);

    mesh.announce({
      organismId: 'node-b',
      endpoint: 'http://localhost/organisms/node-b',
      capabilities: ['cap.analyze'],
      governanceProfile: 'balanced',
      lawHash: LAW_HASH,
    });

    const found = mesh.discover({ capability: 'cap.analyze' });
    expect(found).toHaveLength(1);
    expect(found[0]!.organismId).toBe('node-b');

    const token = sovren.issue('node-a', AuthorityLevel.SOVEREIGN_ROOT);
    const conn = mesh.connect(found[0]!, ['cap.analyze'], token, 'experimental');
    expect(conn.status).toBe('pending');

    const sovrenB = new SovrenAuthority(LAW_KEY);
    const meshB = new MeshNetwork('node-b', LAW_HASH, sovrenB, ledger);
    const tokenB = sovrenB.issue('node-b', AuthorityLevel.SOVEREIGN_ROOT);
    const active = meshB.acceptConnection(conn, tokenB);
    expect(active.status).toBe('active');
  });

  it('routes cross-organism workflows', () => {
    const ledger = new PatternLedger();
    const sovren = new SovrenAuthority(LAW_KEY);
    const mesh = new MeshNetwork('node-a', LAW_HASH, sovren, ledger);

    mesh.announce({
      organismId: 'node-b',
      endpoint: 'http://b',
      capabilities: ['cap.transform'],
      governanceProfile: 'experimental',
      lawHash: LAW_HASH,
    });

    const token = sovren.issue('node-a', AuthorityLevel.SOVEREIGN_ROOT);
    const result = mesh.routeWorkflow(
      {
        workflowId: 'wf-1',
        governanceProfile: 'experimental',
        steps: [
          {
            organismId: 'node-b',
            capabilityId: 'cap.transform',
            input: { data: 'test' },
          },
        ],
      },
      token,
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.governed).toBe(true);
  });
});
