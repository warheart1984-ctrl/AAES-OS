import type { GovernanceMode } from '@aaes-os/platform-core';
import { getGovernanceProfile } from '@aaes-os/platform-core';

export interface MeshInvariantCheck {
  invariantId: string;
  passed: boolean;
  message?: string;
}

export interface MeshInvariantContext {
  nodeId: string;
  organismId: string;
  governanceProfile: GovernanceMode;
  operation: string;
  payload?: Record<string, unknown>;
}

/** Mesh-level invariant engine enforcing cross-node governance rules. */
export class MeshInvariantEngine {
  evaluate(ctx: MeshInvariantContext): MeshInvariantCheck[] {
    const profile = getGovernanceProfile(ctx.governanceProfile);
    const checks: MeshInvariantCheck[] = [];

    checks.push({
      invariantId: 'mesh.core-safety',
      passed: profile.invariantSets.includes('core-safety'),
      message: profile.invariantSets.includes('core-safety')
        ? undefined
        : 'core-safety invariant not in profile',
    });

    checks.push({
      invariantId: 'mesh.audit-trail',
      passed:
        ctx.operation.startsWith('read') ||
        profile.invariantSets.includes('audit-trail'),
      message:
        !ctx.operation.startsWith('read') && !profile.invariantSets.includes('audit-trail')
          ? 'mutating operations require audit-trail'
          : undefined,
    });

    if (ctx.operation.includes('cross-organism')) {
      checks.push({
        invariantId: 'mesh.cross-organism-route',
        passed: profile.allowedAgentBehaviors.includes('cross-organism-route'),
        message: profile.allowedAgentBehaviors.includes('cross-organism-route')
          ? undefined
          : 'cross-organism routing not permitted',
      });
    }

    if (ctx.payload?.sensitive === true) {
      checks.push({
        invariantId: 'mesh.data-residency',
        passed: profile.invariantSets.includes('data-residency'),
        message: profile.invariantSets.includes('data-residency')
          ? undefined
          : 'sensitive payload requires data-residency',
      });
    }

    return checks;
  }

  allPassed(checks: MeshInvariantCheck[]): boolean {
    return checks.every((c) => c.passed);
  }
}
