import type { GovernanceMode } from '@aaes-os/platform-core';

import type { MeshRegistry } from '../discovery/registry.js';
import type { DriftReport } from '../types.js';

export interface DriftDetectorOptions {
  /** Drift score threshold (0-1) above which a report is emitted */
  threshold?: number;
}

/** Mesh-wide governance drift detection across registered nodes. */
export class DriftDetector {
  private readonly observedProfiles = new Map<string, GovernanceMode>();
  private readonly threshold: number;

  constructor(
    private readonly registry: MeshRegistry,
    options: DriftDetectorOptions = {},
  ) {
    this.threshold = options.threshold ?? 0.3;
  }

  recordObservation(nodeId: string, observedProfile: GovernanceMode): void {
    this.observedProfiles.set(nodeId, observedProfile);
  }

  scan(): DriftReport[] {
    const reports: DriftReport[] = [];

    for (const node of this.registry.list()) {
      const observed = this.observedProfiles.get(node.nodeId) ?? node.governanceProfile;
      const driftScore = node.governanceProfile === observed ? 0 : computeDriftScore(
        node.governanceProfile,
        observed,
      );

      if (driftScore >= this.threshold) {
        reports.push({
          nodeId: node.nodeId,
          organismId: node.organismId,
          expectedProfile: node.governanceProfile,
          observedProfile: observed,
          driftScore,
          invariantViolations: driftScore > 0.5 ? ['profile-mismatch'] : [],
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return reports;
  }
}

function computeDriftScore(expected: GovernanceMode, observed: GovernanceMode): number {
  const order: GovernanceMode[] = ['strict', 'balanced', 'experimental'];
  const diff = Math.abs(order.indexOf(expected) - order.indexOf(observed));
  return diff * 0.35;
}
