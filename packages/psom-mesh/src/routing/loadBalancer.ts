import type { MeshRegistry } from '../discovery/registry.js';
import type { MeshNode } from '../types.js';

/** Round-robin load balancing with failover to next healthy node. */
export class MeshLoadBalancer {
  private cursor = 0;

  constructor(private readonly registry: MeshRegistry) {}

  select(capabilityId: string, region?: string): { node: MeshNode; failoverUsed: boolean } | null {
    const candidates = this.registry
      .discover({ capability: capabilityId, region, excludeQuarantined: true })
      .sort((a, b) => a.load - b.load);

    if (candidates.length === 0) return null;

    const primary = candidates[this.cursor % candidates.length];
    this.cursor += 1;

    if (primary.status === 'online' || primary.status === 'degraded') {
      return { node: primary, failoverUsed: false };
    }

    const fallback = candidates.find((n) => n.status === 'online' && n.nodeId !== primary.nodeId);
    if (fallback) return { node: fallback, failoverUsed: true };

    return null;
  }

  markFailure(nodeId: string): void {
    const node = this.registry.get(nodeId);
    if (!node) return;
    node.load = Math.min(1, node.load + 0.2);
    if (node.load >= 0.9) {
      this.registry.setStatus(nodeId, 'degraded');
    }
  }

  markSuccess(nodeId: string): void {
    const node = this.registry.get(nodeId);
    if (!node) return;
    node.load = Math.max(0, node.load - 0.1);
    if (node.status === 'degraded' && node.load < 0.5) {
      this.registry.setStatus(nodeId, 'online');
    }
  }
}
