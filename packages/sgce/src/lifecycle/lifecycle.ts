import type { VersionRegistry } from '@aaes-os/platform-core';
import type { GovernanceMode } from '@aaes-os/platform-core';

import type { DependencyEdge, DependencyGraph, LifecycleRecord, LifecycleState } from '../types.js';

export interface PublishCapabilityInput {
  id: string;
  name: string;
  description: string;
  organId: string;
  ownerId: string;
  version: string;
  governanceProfile: GovernanceMode;
  changelog?: string;
  dependencies?: Array<{ capabilityId: string; versionConstraint: string }>;
  governanceTags?: string[];
}

/** Capability lifecycle — publish, upgrade, deprecate, retire with version registry integration. */
export class CapabilityLifecycle {
  private readonly states = new Map<string, LifecycleRecord>();
  private readonly dependencies = new Map<string, DependencyEdge[]>();

  constructor(private readonly registry: VersionRegistry) {}

  publish(input: PublishCapabilityInput): LifecycleRecord {
    this.registry.publish({
      id: input.id,
      name: input.name,
      description: input.description,
      organId: input.organId,
      ownerId: input.ownerId,
      governanceProfile: input.governanceProfile,
      version: input.version,
      changelog: input.changelog,
      compatibility: {
        minPlatform: '0.1.0',
        maxRisk: input.governanceProfile === 'strict' ? 'low' : 'medium',
        requiredInvariants:
          input.governanceProfile === 'strict'
            ? ['core-safety', 'output-shape', 'determinism', 'audit-trail']
            : ['core-safety', 'audit-trail'],
      },
    });

    if (input.dependencies) {
      this.dependencies.set(
        input.id,
        input.dependencies.map((d) => ({
          from: input.id,
          to: d.capabilityId,
          versionConstraint: d.versionConstraint,
        })),
      );
    }

    const record: LifecycleRecord = {
      capabilityId: input.id,
      version: input.version,
      state: 'published',
      changedAt: new Date().toISOString(),
    };
    this.states.set(`${input.id}@${input.version}`, record);
    return record;
  }

  upgrade(capabilityId: string, targetVersion: string, profile: GovernanceMode): LifecycleRecord {
    this.registry.upgrade(capabilityId, targetVersion, profile);
    const record: LifecycleRecord = {
      capabilityId,
      version: targetVersion,
      state: 'published',
      changedAt: new Date().toISOString(),
      reason: 'upgrade',
    };
    this.states.set(`${capabilityId}@${targetVersion}`, record);
    return record;
  }

  deprecate(capabilityId: string, version: string, reason: string): LifecycleRecord {
    const cap = this.registry.get(capabilityId);
    const ver = cap?.versions.find((v) => v.version === version);
    if (ver) ver.deprecated = true;

    const record: LifecycleRecord = {
      capabilityId,
      version,
      state: 'deprecated',
      changedAt: new Date().toISOString(),
      reason,
    };
    this.states.set(`${capabilityId}@${version}`, record);
    return record;
  }

  retire(capabilityId: string, version: string): LifecycleRecord {
    const record: LifecycleRecord = {
      capabilityId,
      version,
      state: 'retired',
      changedAt: new Date().toISOString(),
    };
    this.states.set(`${capabilityId}@${version}`, record);
    return record;
  }

  getState(capabilityId: string, version: string): LifecycleState {
    return this.states.get(`${capabilityId}@${version}`)?.state ?? 'draft';
  }

  dependencyGraph(capabilityId: string): DependencyGraph {
    const edges = this.dependencies.get(capabilityId) ?? [];
    const nodes = new Set<string>([capabilityId]);
    for (const edge of edges) {
      nodes.add(edge.to);
    }
    return { capabilityId, nodes: [...nodes], edges };
  }
}
