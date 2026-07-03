import type { GovernanceMode } from '@aaes-os/platform-core';

export type MeshNodeStatus = 'online' | 'degraded' | 'offline' | 'quarantined';

export interface MeshNode {
  nodeId: string;
  organismId: string;
  endpoint: string;
  region: string;
  governanceProfile: GovernanceMode;
  capabilities: string[];
  registeredAt: string;
  lastHeartbeat: string;
  status: MeshNodeStatus;
  load: number;
  trustScore: number;
}

export interface MeshMessage {
  messageId: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'workflow' | 'capability' | 'agent' | 'governance';
  payload: Record<string, unknown>;
  governanceProfile: GovernanceMode;
  timestamp: string;
  traceId: string;
}

export interface MeshRouteResult {
  targetNodeId: string;
  endpoint: string;
  failoverUsed: boolean;
  governanceAllowed: boolean;
  violations: string[];
}

export interface MeshTopology {
  nodes: MeshNode[];
  edges: Array<{ from: string; to: string; federationActive: boolean }>;
  generatedAt: string;
}

export interface DriftReport {
  nodeId: string;
  organismId: string;
  expectedProfile: GovernanceMode;
  observedProfile: GovernanceMode;
  driftScore: number;
  invariantViolations: string[];
  detectedAt: string;
}

export interface QuarantineRecord {
  capabilityId: string;
  sourceNodeId: string;
  reason: string;
  quarantinedAt: string;
  trustScoreAtQuarantine: number;
}
