import { describe, expect, it } from 'vitest';

import {
  SovereignXRouter,
  validateSovereignXRouterProofSurface,
  type GovernanceLimits,
  type RuntimeStats,
  type WorkItem,
} from './index.js';
import {
  mapBackend,
  routeSovereignXLlmInference,
} from './engineBridge.ts';

const limits: GovernanceLimits = {
  maxGpuJobs: 2,
  maxCpuJobs: 8,
  maxConcurrentJobs: 4,
  maxGpuTempC: 80,
  maxVramBytes: 8_000_000_000,
  maxTokensPerAgentPerMin: 1_000,
  maxFlopsPerAgentPerMin: 1_000_000_000_000,
};

const baseRuntime: RuntimeStats = {
  activeGpuJobs: 1,
  activeCpuJobs: 1,
  gpuUtil: 0.5,
  cpuUtil: 0.3,
  gpuTempC: 72,
  vramUsedBytes: 2_000_000_000,
  vramTotalBytes: 16_000_000_000,
};

function createRouter() {
  const router = new SovereignXRouter({ clock: () => 1_700_000_000_000 });
  router.registerIntent({
    id: 'intent-llm',
    domain: 'llm_step',
    rules: 'llm steps are allowed on GPU or CPU when governed',
    allowedTargets: ['GPU', 'CPU'],
    maxTokensPerAgentPerMin: 512,
    maxFlopsPerAgentPerMin: 500_000_000_000,
  });
  router.registerIntent({
    id: 'intent-tool',
    domain: 'tool_call',
    rules: 'tool calls must stay on CPU governance path',
    allowedTargets: ['CPU'],
    maxTokensPerAgentPerMin: 64,
    maxFlopsPerAgentPerMin: 10_000_000,
  });
  return router;
}

describe('SovereignXRouter', () => {
  const workItem: WorkItem = {
    id: 'work-1',
    agentId: 'agent-7',
    kind: 'llm_step',
    intentId: 'intent-llm',
    costEstimateTokens: 128,
    costEstimateFlops: 120_000_000_000,
    costEstimateMs: 40,
    priority: 3,
  };

  it('routes governed llm work to GPU when safe', () => {
    const router = createRouter();
    const evaluation = router.evaluate(workItem, baseRuntime, limits);

    expect(evaluation.localDecision.target).toBe('GPU');
    expect(evaluation.effectiveDecision.target).toBe('GPU');
    expect(evaluation.evidence.workItemId).toBe('work-1');
    expect(router.listEvidence()).toHaveLength(1);
  });

  it('falls back to CPU when the GPU is too hot', () => {
    const router = createRouter();
    const hotRuntime = { ...baseRuntime, gpuTempC: 91 };
    const evaluation = router.evaluate(workItem, hotRuntime, limits);

    expect(evaluation.localDecision.target).toBe('CPU');
    expect(evaluation.effectiveDecision.target).toBe('DELAY');
    expect(evaluation.effectiveDecision.reason).toContain('CIEMS throttle');
  });

  it('delays work when the agent exceeds its budget', () => {
    const router = createRouter();
    const overloaded: WorkItem = { ...workItem, costEstimateTokens: 2_000 };
    const evaluation = router.evaluate(overloaded, baseRuntime, limits);

    expect(evaluation.localDecision.target).toBe('DELAY');
    expect(evaluation.effectiveDecision.target).toBe('DELAY');
    expect(evaluation.ciemsDecisions.some((decision) => decision.action === 'throttle')).toBe(true);
  });

  it('quarantines unregistered intents', () => {
    const router = createRouter();
    const unknownIntent: WorkItem = { ...workItem, intentId: 'intent-missing' };
    const evaluation = router.evaluate(unknownIntent, baseRuntime, limits);

    expect(evaluation.ciemsDecisions.some((decision) => decision.action === 'quarantine')).toBe(true);
    expect(evaluation.effectiveDecision.target).toBe('DROP');
  });

  it('keeps tool calls on the CPU path', () => {
    const router = createRouter();
    const toolItem: WorkItem = {
      id: 'work-2',
      agentId: 'agent-2',
      kind: 'tool_call',
      intentId: 'intent-tool',
      costEstimateTokens: 32,
      costEstimateFlops: 1_000_000,
    };

    const evaluation = router.evaluate(toolItem, baseRuntime, limits);

    expect(evaluation.localDecision.target).toBe('CPU');
    expect(evaluation.effectiveDecision.target).toBe('CPU');
  });

  it('maps llm work items into engine backend choices', () => {
    const router = createRouter();
    const routed = routeSovereignXLlmInference(
      router,
      {
        id: 'llm-work-1',
        agentId: 'agent-llm',
        intentId: 'intent-llm',
        promptTokens: 64,
        estimatedFlops: 10_000_000_000,
        preferredGpuBackend: 'opencl',
      },
      baseRuntime,
      limits,
    );

    expect(routed.routeEvaluation.workItem.kind).toBe('llm_step');
    expect(mapBackend(routed.routeEvaluation)).toBe('opencl');
    expect(routed.backend).toBe('opencl');
  });
});

describe('SovereignX proof surface', () => {
  it('validates the router proof surface', () => {
    const validation = validateSovereignXRouterProofSurface();

    expect(validation.passed).toBe(true);
    expect(validation.issues.every((issue) => issue.severity !== 'error')).toBe(true);
  });
});
