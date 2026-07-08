export type RouteTarget = 'CPU' | 'GPU' | 'DROP' | 'DELAY';

export type RuntimeMode =
  | 'Normal'
  | 'GpuDegraded'
  | 'CpuDegraded'
  | 'CiemsOffline'
  | 'MeasurementUntrusted'
  | 'Quarantine';

export type CiemsDecisionAction = 'allow' | 'throttle' | 'quarantine' | 'kill';

export interface WorkItem {
  id: string;
  agentId: string;
  kind: 'llm_step' | 'render_frame' | 'tool_call' | 'matmul' | 'attention' | 'mlp' | 'physics_step' | string;
  intentId: string;
  costEstimateTokens: number;
  costEstimateFlops: number;
  costEstimateMs?: number;
  priority?: number;
  tenantId?: string;
}

export interface RuntimeStats {
  activeGpuJobs: number;
  activeCpuJobs: number;
  gpuUtil: number;
  cpuUtil: number;
  gpuTempC: number;
  vramUsedBytes: number;
  vramTotalBytes: number;
}

export interface GovernanceLimits {
  maxGpuJobs: number;
  maxCpuJobs: number;
  maxConcurrentJobs: number;
  maxGpuTempC: number;
  maxVramBytes: number;
  maxTokensPerAgentPerMin: number;
  maxFlopsPerAgentPerMin: number;
  gpuKindThreshold?: number;
}

export interface MeasurementHealth {
  trusted: boolean;
  stale: boolean;
  sampleCount: number;
  windowMs: number;
  temperatureVarianceC: number;
  notes: string[];
}

export interface RouteDecision {
  target: RouteTarget;
  reason: string;
  mode: RuntimeMode;
}

export interface EvidenceRecord {
  id: string;
  workItemId: string;
  agentId: string;
  kind: WorkItem['kind'];
  intentId: string;
  estTokens: number;
  estFlops: number;
  runtime: RuntimeStats;
  limits: GovernanceLimits;
  localDecision: RouteDecision;
  timestamp: string;
}

export interface CiemsIntentSpec {
  id: string;
  domain: WorkItem['kind'] | 'governance' | 'continuity' | 'planning' | string;
  rules: string;
  allowedTargets: RouteTarget[];
  maxTokensPerAgentPerMin?: number;
  maxFlopsPerAgentPerMin?: number;
}

export interface CiemsDecision {
  workId: string;
  agentId: string;
  action: CiemsDecisionAction;
  reason: string;
  effectiveTarget?: RouteTarget;
}

export interface AgentBudgetSnapshot {
  agentId: string;
  tokensPerMin: number;
  flopsPerMin: number;
  activeJobs: number;
  priority: number;
}

export interface RouteEvaluation {
  workItem: WorkItem;
  runtime: RuntimeStats;
  limits: GovernanceLimits;
  measurementHealth: MeasurementHealth;
  localDecision: RouteDecision;
  ciemsDecisions: CiemsDecision[];
  effectiveDecision: RouteDecision;
  evidence: EvidenceRecord;
}
