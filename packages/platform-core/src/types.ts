import type { CognitiveRisk } from '@aaes-os/governed-runtime';

export type GovernanceMode = 'strict' | 'balanced' | 'experimental';

export interface GovernanceProfile {
  id: GovernanceMode;
  name: string;
  description: string;
  invariantSets: string[];
  riskThreshold: CognitiveRisk;
  allowedAgentBehaviors: string[];
  billingTier: 'enterprise' | 'standard' | 'sandbox';
  apiAccessLevel: 'full' | 'standard' | 'experimental';
  marketplaceAccess: boolean;
}

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export interface CapabilityVersion {
  version: string;
  semver: SemVer;
  moduleId: string;
  organId: string;
  publishedAt: string;
  changelog?: string;
  compatibility: {
    minPlatform: string;
    maxRisk: CognitiveRisk;
    requiredInvariants: string[];
  };
  deprecated?: boolean;
}

export interface CapabilityRecord {
  id: string;
  name: string;
  description: string;
  organId: string;
  ownerId: string;
  currentVersion: string;
  versions: CapabilityVersion[];
  governanceProfile: GovernanceMode;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  label: string;
  keyPrefix: string;
  keyHash: string;
  ownerId: string;
  governanceProfile: GovernanceMode;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

export interface UsageRecord {
  id: string;
  ownerId: string;
  capabilityId?: string;
  operation: string;
  units: number;
  governanceProfile: GovernanceMode;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuthSession {
  sessionId: string;
  ownerId: string;
  governanceProfile: GovernanceMode;
  createdAt: string;
  expiresAt: string;
}

export interface InvokeRequest {
  capabilityId: string;
  version?: string;
  input: Record<string, unknown>;
  traceId?: string;
}

export interface InvokeResult {
  capabilityId: string;
  version: string;
  output: Record<string, unknown>;
  governance: {
    profile: GovernanceMode;
    violations: string[];
    allowed: boolean;
  };
  billing: {
    units: number;
    operation: string;
  };
}

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
  sourceVersion: string;
  targetVersion: string;
}
