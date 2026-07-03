import { describe, expect, it } from 'vitest';

import { PsomMesh } from './PsomMesh.js';

describe('PsomMesh', () => {
  it('registers peers and routes capability messages', () => {
    const mesh = new PsomMesh({
      nodeId: 'node-a',
      organismId: 'org-a',
      endpoint: 'http://localhost:4001',
      governanceProfile: 'balanced',
    });

    mesh.registerPeer({
      nodeId: 'node-b',
      organismId: 'org-b',
      endpoint: 'http://localhost:4002',
      governanceProfile: 'balanced',
      capabilities: ['cap.analyze'],
    });

    const result = mesh.sendMessage('node-b', 'capability', { test: true }, 'trace-1');
    expect(result.allowed).toBe(true);
    expect(result.route.targetNodeId).toBe('node-b');
  });

  it('blocks cross-organism agent routing for strict profile', () => {
    const mesh = new PsomMesh({
      nodeId: 'node-strict',
      organismId: 'org-strict',
      endpoint: 'http://localhost:4003',
      governanceProfile: 'strict',
    });

    mesh.registry.register({
      nodeId: 'node-exp',
      organismId: 'org-exp',
      endpoint: 'http://localhost:4004',
      governanceProfile: 'experimental',
      capabilities: ['cap.test'],
    });

    const result = mesh.sendMessage('node-exp', 'agent', {}, 'trace-2');
    expect(result.allowed).toBe(false);
  });

  it('rejects experimental peer registration under strict profile', () => {
    const mesh = new PsomMesh({
      nodeId: 'node-strict2',
      organismId: 'org-strict2',
      endpoint: 'http://localhost:4006',
      governanceProfile: 'strict',
    });

    expect(() =>
      mesh.registerPeer({
        nodeId: 'node-exp2',
        organismId: 'org-exp2',
        endpoint: 'http://localhost:4007',
        governanceProfile: 'experimental',
        capabilities: ['cap.test'],
      }),
    ).toThrow(/negotiation failed/);
  });

  it('produces mesh topology', () => {
    const mesh = new PsomMesh({
      nodeId: 'node-topo',
      organismId: 'org-topo',
      endpoint: 'http://localhost:4005',
      governanceProfile: 'balanced',
    });

    const topo = mesh.topology();
    expect(topo.nodes.length).toBeGreaterThan(0);
    expect(topo.generatedAt).toBeTruthy();
  });
});
