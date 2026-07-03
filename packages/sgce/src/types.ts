import type { GovernanceMode } from '@aaes-os/platform-core';

export type PricingModel = 'free' | 'rental' | 'subscription' | 'federation';

export interface CapabilityToken {
  tokenId: string;
  capabilityId: string;
  version: string;
  ownerId: string;
  issuedAt: string;
  governanceProfile: GovernanceMode;
  /** Non-financial governance-tracked units */
  units: number;
  metadata?: Record<string, unknown>;
}

export interface ProvenanceRecord {
  capabilityId: string;
  version: string;
  publisherId: string;
  parentCapabilityId?: string;
  parentVersion?: string;
  lineageDepth: number;
  trustScore: number;
  governanceTags: string[];
  recordedAt: string;
}

export interface MarketplaceListing {
  listingId: string;
  capabilityId: string;
  version: string;
  sellerId: string;
  title: string;
  description: string;
  pricingModel: PricingModel;
  priceUnits: number;
  governanceProfile: GovernanceMode;
  rating: number;
  ratingCount: number;
  publishedAt: string;
  active: boolean;
}

export interface DependencyEdge {
  from: string;
  to: string;
  versionConstraint: string;
}

export interface DependencyGraph {
  capabilityId: string;
  nodes: string[];
  edges: DependencyEdge[];
}

export type LifecycleState = 'draft' | 'published' | 'deprecated' | 'retired';

export interface LifecycleRecord {
  capabilityId: string;
  version: string;
  state: LifecycleState;
  changedAt: string;
  reason?: string;
}
