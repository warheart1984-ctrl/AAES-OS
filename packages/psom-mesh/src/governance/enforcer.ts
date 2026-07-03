import type { GovernanceMode } from '@aaes-os/platform-core';
import { getGovernanceProfile } from '@aaes-os/platform-core';

export interface GovernanceNegotiationResult {
  agreed: boolean;
  negotiatedProfile: GovernanceMode;
  concessions: string[];
  blockedBehaviors: string[];
}

/** Multi-profile governance negotiation between organisms. */
export class GovernanceEnforcer {
  negotiate(
    localProfile: GovernanceMode,
    remoteProfile: GovernanceMode,
  ): GovernanceNegotiationResult {
    const local = getGovernanceProfile(localProfile);
    const remote = getGovernanceProfile(remoteProfile);
    const concessions: string[] = [];
    const blockedBehaviors: string[] = [];

    const profileOrder: GovernanceMode[] = ['strict', 'balanced', 'experimental'];
    const localIdx = profileOrder.indexOf(localProfile);
    const remoteIdx = profileOrder.indexOf(remoteProfile);
    const negotiatedProfile = profileOrder[Math.min(localIdx, remoteIdx)];

    const negotiated = getGovernanceProfile(negotiatedProfile);
    const sharedInvariants = local.invariantSets.filter((inv) =>
      remote.invariantSets.includes(inv),
    );

    if (sharedInvariants.length < negotiated.invariantSets.length) {
      for (const inv of negotiated.invariantSets) {
        if (!sharedInvariants.includes(inv)) {
          concessions.push(`dropped invariant requirement: ${inv}`);
        }
      }
    }

    for (const behavior of remote.allowedAgentBehaviors) {
      if (!local.allowedAgentBehaviors.includes(behavior)) {
        blockedBehaviors.push(behavior);
      }
    }

    const agreed = blockedBehaviors.length === 0;

    return { agreed, negotiatedProfile, concessions, blockedBehaviors };
  }

  enforceInvariantSet(
    profile: GovernanceMode,
    requiredInvariants: string[],
  ): { allowed: boolean; missing: string[] } {
    const gov = getGovernanceProfile(profile);
    const missing = requiredInvariants.filter((inv) => !gov.invariantSets.includes(inv));
    return { allowed: missing.length === 0, missing };
  }
}
