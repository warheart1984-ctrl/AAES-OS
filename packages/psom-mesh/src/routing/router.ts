import type { GovernanceMode } from '@aaes-os/platform-core';
import { getGovernanceProfile } from '@aaes-os/platform-core';

import type { MeshRegistry } from '../discovery/registry.js';
import type { MeshMessage, MeshRouteResult } from '../types.js';

export interface MeshRouterOptions {
  localNodeId: string;
  localGovernanceProfile: GovernanceMode;
}

/** Mesh-wide routing for workflows, capabilities, and agent messages. */
export class MeshRouter {
  constructor(
    private readonly registry: MeshRegistry,
    private readonly options: MeshRouterOptions,
  ) {}

  route(message: Omit<MeshMessage, 'messageId' | 'timestamp'>): MeshRouteResult {
    const target = this.registry.get(message.toNodeId);
    const violations: string[] = [];

    if (!target) {
      return {
        targetNodeId: message.toNodeId,
        endpoint: '',
        failoverUsed: false,
        governanceAllowed: false,
        violations: [`target node "${message.toNodeId}" not found`],
      };
    }

    if (target.status === 'quarantined' || target.status === 'offline') {
      violations.push(`target node status: ${target.status}`);
    }

    const localProfile = getGovernanceProfile(this.options.localGovernanceProfile);
    const remoteProfile = getGovernanceProfile(target.governanceProfile);

    if (message.type === 'capability' && !localProfile.marketplaceAccess) {
      violations.push('local profile blocks capability mesh routing');
    }

    if (message.type === 'agent' && !localProfile.allowedAgentBehaviors.includes('cross-organism-route')) {
      violations.push('cross-organism agent routing not allowed');
    }

    const minInvariants = remoteProfile.invariantSets.filter(
      (inv) => !localProfile.invariantSets.includes(inv),
    );
    for (const inv of minInvariants) {
      violations.push(`governance mismatch: missing invariant ${inv}`);
    }

    const governanceAllowed = violations.length === 0;

    return {
      targetNodeId: target.nodeId,
      endpoint: target.endpoint,
      failoverUsed: false,
      governanceAllowed,
      violations,
    };
  }

  buildMessage(
    toNodeId: string,
    type: MeshMessage['type'],
    payload: Record<string, unknown>,
    traceId: string,
  ): MeshMessage {
    return {
      messageId: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      fromNodeId: this.options.localNodeId,
      toNodeId,
      type,
      payload,
      governanceProfile: this.options.localGovernanceProfile,
      timestamp: new Date().toISOString(),
      traceId,
    };
  }
}
