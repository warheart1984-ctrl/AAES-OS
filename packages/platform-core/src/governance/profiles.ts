import type { CognitiveRisk } from '@aaes-os/governed-runtime';

import type { GovernanceMode, GovernanceProfile } from '../types.js';

export const GOVERNANCE_PROFILES: Record<GovernanceMode, GovernanceProfile> = {
  strict: {
    id: 'strict',
    name: 'Strict',
    description: 'Maximum governance — all invariants enforced, lowest risk tolerance.',
    invariantSets: ['core-safety', 'output-shape', 'determinism', 'audit-trail', 'data-residency'],
    riskThreshold: 'low',
    allowedAgentBehaviors: ['read', 'analyze', 'recommend'],
    billingTier: 'enterprise',
    apiAccessLevel: 'full',
    marketplaceAccess: false,
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description: 'Production default — core invariants with moderate agent autonomy.',
    invariantSets: ['core-safety', 'output-shape', 'audit-trail'],
    riskThreshold: 'medium',
    allowedAgentBehaviors: ['read', 'analyze', 'recommend', 'execute-approved', 'publish-capability'],
    billingTier: 'standard',
    apiAccessLevel: 'standard',
    marketplaceAccess: true,
  },
  experimental: {
    id: 'experimental',
    name: 'Experimental',
    description: 'Sandbox mode — minimal invariants for rapid iteration.',
    invariantSets: ['core-safety'],
    riskThreshold: 'high',
    allowedAgentBehaviors: [
      'read',
      'analyze',
      'recommend',
      'execute-approved',
      'publish-capability',
      'mesh-share',
      'cross-organism-route',
    ],
    billingTier: 'sandbox',
    apiAccessLevel: 'experimental',
    marketplaceAccess: true,
  },
};

export function getGovernanceProfile(mode: GovernanceMode): GovernanceProfile {
  return GOVERNANCE_PROFILES[mode];
}

export function listGovernanceProfiles(): GovernanceProfile[] {
  return Object.values(GOVERNANCE_PROFILES);
}

const RISK_ORDER: CognitiveRisk[] = ['low', 'medium', 'high', 'critical'];

export function riskWithinThreshold(
  risk: CognitiveRisk,
  threshold: CognitiveRisk,
): boolean {
  return RISK_ORDER.indexOf(risk) <= RISK_ORDER.indexOf(threshold);
}

export function assertBehaviorAllowed(
  profile: GovernanceProfile,
  behavior: string,
): void {
  if (!profile.allowedAgentBehaviors.includes(behavior)) {
    throw new Error(
      `GOVERNANCE: behavior "${behavior}" not allowed under ${profile.name} profile`,
    );
  }
}

export function assertApiAccess(
  profile: GovernanceProfile,
  requiredLevel: GovernanceProfile['apiAccessLevel'],
): void {
  const levels: GovernanceProfile['apiAccessLevel'][] = ['experimental', 'standard', 'full'];
  if (levels.indexOf(profile.apiAccessLevel) < levels.indexOf(requiredLevel)) {
    throw new Error(
      `GOVERNANCE: API access level "${requiredLevel}" requires higher profile than ${profile.name}`,
    );
  }
}
