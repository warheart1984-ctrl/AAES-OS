import type {
  GovernanceLimits,
  RouteEvaluation,
  RuntimeStats,
  WorkItem,
} from './types.js';
import type { SovereignXRouter } from './SovereignXRouter.js';

export type SovereignXEngineBackend = 'cpu' | 'opencl' | 'vulkan';

export interface SovereignXLlmInferenceRequest {
  id: string;
  agentId: string;
  intentId: string;
  promptTokens: number;
  estimatedFlops: number;
  priority?: number;
  tenantId?: string;
  preferredGpuBackend?: Exclude<SovereignXEngineBackend, 'cpu'>;
}

export interface SovereignXLlmRoutingResult {
  routeEvaluation: RouteEvaluation;
  backend: SovereignXEngineBackend | 'delay' | 'drop';
}

export function routeSovereignXLlmInference(
  router: SovereignXRouter,
  request: SovereignXLlmInferenceRequest,
  runtime: RuntimeStats,
  limits: GovernanceLimits,
): SovereignXLlmRoutingResult {
  const workItem: WorkItem = {
    id: request.id,
    agentId: request.agentId,
    kind: 'llm_step',
    intentId: request.intentId,
    costEstimateTokens: request.promptTokens,
    costEstimateFlops: request.estimatedFlops,
    priority: request.priority,
    tenantId: request.tenantId,
  };

  const routeEvaluation = router.evaluate(workItem, runtime, limits);
  return {
    routeEvaluation,
    backend: mapBackend(routeEvaluation, request.preferredGpuBackend),
  };
}

export function mapBackend(
  routeEvaluation: RouteEvaluation,
  preferredGpuBackend: Exclude<SovereignXEngineBackend, 'cpu'> = 'opencl',
): SovereignXEngineBackend | 'delay' | 'drop' {
  const target = routeEvaluation.effectiveDecision.target;
  if (target === 'DELAY') {
    return 'delay';
  }
  if (target === 'DROP') {
    return 'drop';
  }
  if (target === 'GPU') {
    return preferredGpuBackend;
  }
  return 'cpu';
}
