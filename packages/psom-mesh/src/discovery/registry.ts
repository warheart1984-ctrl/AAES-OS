import type { GovernanceMode } from '@aaes-os/platform-core';

import type { MeshNode, MeshNodeStatus } from '../types.js';

export interface RegisterNodeInput {
  nodeId: string;
  organismId: string;
  endpoint: string;
  region?: string;
  governanceProfile: GovernanceMode;
  capabilities?: string[];
}

/** Global mesh discovery and registration registry. */
export class MeshRegistry {
  private readonly nodes = new Map<string, MeshNode>();

  register(input: RegisterNodeInput): MeshNode {
    const now = new Date().toISOString();
    const node: MeshNode = {
      nodeId: input.nodeId,
      organismId: input.organismId,
      endpoint: input.endpoint,
      region: input.region ?? 'global',
      governanceProfile: input.governanceProfile,
      capabilities: input.capabilities ?? [],
      registeredAt: now,
      lastHeartbeat: now,
      status: 'online',
      load: 0,
      trustScore: 1.0,
    };
    this.nodes.set(input.nodeId, node);
    return node;
  }

  heartbeat(nodeId: string, load?: number): MeshNode {
    const node = this.require(nodeId);
    node.lastHeartbeat = new Date().toISOString();
    if (load !== undefined) node.load = load;
    if (node.status === 'offline') node.status = 'online';
    return node;
  }

  discover(filter?: {
    capability?: string;
    region?: string;
    governanceProfile?: GovernanceMode;
    excludeQuarantined?: boolean;
  }): MeshNode[] {
    return [...this.nodes.values()].filter((n) => {
      if (filter?.excludeQuarantined && n.status === 'quarantined') return false;
      if (filter?.capability && !n.capabilities.includes(filter.capability)) return false;
      if (filter?.region && n.region !== filter.region) return false;
      if (filter?.governanceProfile && n.governanceProfile !== filter.governanceProfile) {
        return false;
      }
      return n.status === 'online' || n.status === 'degraded';
    });
  }

  get(nodeId: string): MeshNode | undefined {
    return this.nodes.get(nodeId);
  }

  list(): MeshNode[] {
    return [...this.nodes.values()];
  }

  setStatus(nodeId: string, status: MeshNodeStatus): void {
    this.require(nodeId).status = status;
  }

  updateTrustScore(nodeId: string, score: number): void {
    const node = this.require(nodeId);
    node.trustScore = Math.max(0, Math.min(1, score));
    if (node.trustScore < 0.3) node.status = 'quarantined';
  }

  private require(nodeId: string): MeshNode {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`MESH: node "${nodeId}" not registered`);
    return node;
  }
}
