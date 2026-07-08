import {
  CiemsBrain,
} from './ciems.js';
import type {
  AgentBudgetSnapshot,
  CiemsDecision,
  CiemsIntentSpec,
  EvidenceRecord,
  GovernanceLimits,
  MeasurementHealth,
  RouteDecision,
  RouteEvaluation,
  RuntimeMode,
  RuntimeStats,
  WorkItem,
} from './types.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createEmptyMeasurementHealth(): MeasurementHealth {
  return {
    trusted: true,
    stale: false,
    sampleCount: 0,
    windowMs: 60_000,
    temperatureVarianceC: 0,
    notes: [],
  };
}

interface UsageWindow {
  startedAt: number;
  tokens: number;
  flops: number;
  activeJobs: number;
  priority: number;
}

export interface SovereignXRouterOptions {
  clock?: () => number;
  windowMs?: number;
}

export class SovereignXRouter {
  private readonly clock: () => number;
  private readonly windowMs: number;
  private readonly ciems = new CiemsBrain();
  private readonly usage = new Map<string, UsageWindow>();
  private readonly evidence: EvidenceRecord[] = [];
  private readonly decisions: RouteEvaluation[] = [];
  private measurementHealth = createEmptyMeasurementHealth();
  private runtimeMode: RuntimeMode = 'Normal';

  constructor(options: SovereignXRouterOptions = {}) {
    this.clock = options.clock ?? (() => Date.now());
    this.windowMs = options.windowMs ?? 60_000;
  }

  registerIntent(intent: CiemsIntentSpec): void {
    this.ciems.registerIntent(intent);
  }

  submitEvidence(record: EvidenceRecord): void {
    this.evidence.push(clone(record));
    this.ciems.submitEvidence(record);
  }

  listEvidence(): EvidenceRecord[] {
    return this.evidence.map((entry) => clone(entry));
  }

  getMeasurementHealth(): MeasurementHealth {
    return clone(this.measurementHealth);
  }

  setMeasurementHealth(health: Partial<MeasurementHealth>): void {
    this.measurementHealth = {
      ...this.measurementHealth,
      ...health,
      notes: health.notes ? [...health.notes] : [...this.measurementHealth.notes],
    };
  }

  setRuntimeMode(mode: RuntimeMode): void {
    this.runtimeMode = mode;
  }

  getRuntimeMode(): RuntimeMode {
    return this.runtimeMode;
  }

  getDecisions(): RouteEvaluation[] {
    return this.decisions.map((entry) => clone(entry));
  }

  getCiemsBrain(): CiemsBrain {
    return this.ciems;
  }

  route(workItem: WorkItem, runtime: RuntimeStats, limits: GovernanceLimits): RouteDecision {
    return this.evaluate(workItem, runtime, limits).effectiveDecision;
  }

  evaluate(workItem: WorkItem, runtime: RuntimeStats, limits: GovernanceLimits): RouteEvaluation {
    const now = this.clock();
    const budget = this.updateBudgetSnapshot(workItem, now);
    const localDecision = this.decideLocalRoute(workItem, runtime, limits, budget);
    const ciemsDecisions = this.ciems.evaluate(
      workItem,
      runtime,
      limits,
      localDecision,
      this.measurementHealth,
      budget,
    );
    const effectiveDecision = this.applyCiemsDecisions(localDecision, ciemsDecisions);
    const evidence = this.createEvidence(workItem, runtime, limits, localDecision, now);
    this.submitEvidence(evidence);

    const evaluation: RouteEvaluation = {
      workItem: clone(workItem),
      runtime: clone(runtime),
      limits: clone(limits),
      measurementHealth: this.getMeasurementHealth(),
      localDecision,
      ciemsDecisions,
      effectiveDecision,
      evidence,
    };

    this.decisions.push(clone(evaluation));
    return evaluation;
  }

  private updateBudgetSnapshot(workItem: WorkItem, now: number): AgentBudgetSnapshot {
    const snapshot = this.usage.get(workItem.agentId);
    if (!snapshot || now - snapshot.startedAt > this.windowMs) {
      const fresh: UsageWindow = {
        startedAt: now,
        tokens: workItem.costEstimateTokens,
        flops: workItem.costEstimateFlops,
        activeJobs: 1,
        priority: workItem.priority ?? 0,
      };
      this.usage.set(workItem.agentId, fresh);
      return {
        agentId: workItem.agentId,
        tokensPerMin: fresh.tokens,
        flopsPerMin: fresh.flops,
        activeJobs: fresh.activeJobs,
        priority: fresh.priority,
      };
    }

    snapshot.tokens += workItem.costEstimateTokens;
    snapshot.flops += workItem.costEstimateFlops;
    snapshot.activeJobs += 1;
    snapshot.priority = workItem.priority ?? snapshot.priority;

    return {
      agentId: workItem.agentId,
      tokensPerMin: snapshot.tokens,
      flopsPerMin: snapshot.flops,
      activeJobs: snapshot.activeJobs,
      priority: snapshot.priority,
    };
  }

  private decideLocalRoute(
    workItem: WorkItem,
    runtime: RuntimeStats,
    limits: GovernanceLimits,
    budget: AgentBudgetSnapshot,
  ): RouteDecision {
    if (this.runtimeMode === 'MeasurementUntrusted') {
      return { target: 'CPU', reason: 'measurement health is untrusted', mode: this.runtimeMode };
    }

    if (this.runtimeMode === 'GpuDegraded') {
      return { target: 'CPU', reason: 'GPU is in degraded mode', mode: this.runtimeMode };
    }

    if (this.runtimeMode === 'CpuDegraded' && this.isGpuFriendlyKind(workItem.kind)) {
      return { target: 'GPU', reason: 'CPU is in degraded mode and GPU work is allowed', mode: this.runtimeMode };
    }

    if (runtime.gpuTempC > limits.maxGpuTempC) {
      this.runtimeMode = 'GpuDegraded';
      return { target: 'CPU', reason: 'GPU too hot', mode: this.runtimeMode };
    }

    if (runtime.vramUsedBytes > limits.maxVramBytes) {
      return { target: 'CPU', reason: 'VRAM budget exceeded', mode: this.runtimeMode };
    }

    if (budget.tokensPerMin > limits.maxTokensPerAgentPerMin || budget.flopsPerMin > limits.maxFlopsPerAgentPerMin) {
      return { target: 'DELAY', reason: 'agent over budget', mode: this.runtimeMode };
    }

    if (budget.activeJobs >= limits.maxConcurrentJobs) {
      return { target: 'DELAY', reason: 'agent concurrency limit reached', mode: this.runtimeMode };
    }

    if (this.isGpuFriendlyKind(workItem.kind) && runtime.activeGpuJobs < limits.maxGpuJobs) {
      return { target: 'GPU', reason: 'GPU path selected', mode: this.runtimeMode };
    }

    if (this.isGpuFriendlyKind(workItem.kind) && runtime.activeGpuJobs >= limits.maxGpuJobs) {
      return { target: 'CPU', reason: 'GPU saturated, fallback to CPU', mode: this.runtimeMode };
    }

    if (workItem.kind === 'tool_call') {
      return { target: 'CPU', reason: 'tool call kept on CPU governance path', mode: this.runtimeMode };
    }

    return { target: 'CPU', reason: 'governance/low-cost work', mode: this.runtimeMode };
  }

  private applyCiemsDecisions(localDecision: RouteDecision, decisions: CiemsDecision[]): RouteDecision {
    if (decisions.some((decision) => decision.action === 'kill')) {
      this.runtimeMode = 'Quarantine';
      return { target: 'DROP', reason: 'CIEMS kill decision', mode: this.runtimeMode };
    }

    if (decisions.some((decision) => decision.action === 'quarantine')) {
      this.runtimeMode = 'Quarantine';
      return { target: 'DROP', reason: 'CIEMS quarantine decision', mode: this.runtimeMode };
    }

    if (decisions.some((decision) => decision.action === 'throttle')) {
      return { target: 'DELAY', reason: `CIEMS throttle: ${decisions[0].reason}`, mode: localDecision.mode };
    }

    return localDecision;
  }

  private createEvidence(
    workItem: WorkItem,
    runtime: RuntimeStats,
    limits: GovernanceLimits,
    localDecision: RouteDecision,
    now: number,
  ): EvidenceRecord {
    return {
      id: `evidence-${workItem.id}-${now}`,
      workItemId: workItem.id,
      agentId: workItem.agentId,
      kind: workItem.kind,
      intentId: workItem.intentId,
      estTokens: workItem.costEstimateTokens,
      estFlops: workItem.costEstimateFlops,
      runtime: clone(runtime),
      limits: clone(limits),
      localDecision,
      timestamp: new Date(now).toISOString(),
    };
  }

  private isGpuFriendlyKind(kind: WorkItem['kind']): boolean {
    return kind === 'llm_step' || kind === 'render_frame' || kind === 'matmul' || kind === 'attention' || kind === 'mlp' || kind === 'physics_step';
  }
}
