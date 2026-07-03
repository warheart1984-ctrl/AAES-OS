import { FederationManager } from '@aaes-os/federation';
import type { GovernanceMode } from '@aaes-os/platform-core';

import { MeshRegistry } from './discovery/registry.js';
import { GovernanceEnforcer } from './governance/enforcer.js';
import { MeshInvariantEngine } from './invariants/meshEngine.js';
import { MeshLoadBalancer } from './routing/loadBalancer.js';
import { MeshRouter } from './routing/router.js';
import { AdversarialQuarantine } from './quarantine/adversarial.js';
import { DriftDetector } from './drift/detector.js';
import type { MeshMessage, MeshTopology } from './types.js';

export interface PsomMeshOptions {
  nodeId: string;
  organismId: string;
  endpoint: string;
  governanceProfile: GovernanceMode;
  federation?: FederationManager;
}

/** Unified PSOM orchestrator — discovery, routing, governance, and cross-organism execution. */
export class PsomMesh {
  readonly registry = new MeshRegistry();
  readonly router: MeshRouter;
  readonly loadBalancer: MeshLoadBalancer;
  readonly governance = new GovernanceEnforcer();
  readonly invariants = new MeshInvariantEngine();
  readonly quarantine = new AdversarialQuarantine();
  readonly drift: DriftDetector;
  readonly federation?: FederationManager;

  constructor(private readonly options: PsomMeshOptions) {
    this.registry.register({
      nodeId: options.nodeId,
      organismId: options.organismId,
      endpoint: options.endpoint,
      governanceProfile: options.governanceProfile,
    });
    this.router = new MeshRouter(this.registry, {
      localNodeId: options.nodeId,
      localGovernanceProfile: options.governanceProfile,
    });
    this.loadBalancer = new MeshLoadBalancer(this.registry);
    this.drift = new DriftDetector(this.registry);
    this.federation = options.federation;
  }

  registerPeer(input: {
    nodeId: string;
    organismId: string;
    endpoint: string;
    governanceProfile: GovernanceMode;
    capabilities: string[];
  }) {
    const negotiation = this.governance.negotiate(
      this.options.governanceProfile,
      input.governanceProfile,
    );
    if (!negotiation.agreed) {
      throw new Error(
        `PSOM: governance negotiation failed with ${input.nodeId}: ${negotiation.blockedBehaviors.join(', ')}`,
      );
    }
    return this.registry.register({
      ...input,
      governanceProfile: negotiation.negotiatedProfile,
    });
  }

  sendMessage(
    toNodeId: string,
    type: MeshMessage['type'],
    payload: Record<string, unknown>,
    traceId: string,
  ) {
    const message = this.router.buildMessage(toNodeId, type, payload, traceId);
    const route = this.router.route(message);
    const checks = this.invariants.evaluate({
      nodeId: this.options.nodeId,
      organismId: this.options.organismId,
      governanceProfile: this.options.governanceProfile,
      operation: type,
      payload,
    });

    return {
      message,
      route,
      invariants: checks,
      allowed: route.governanceAllowed && this.invariants.allPassed(checks),
    };
  }

  executeCrossOrganism(
    capabilityId: string,
    input: Record<string, unknown>,
    traceId: string,
  ) {
    if (this.quarantine.isQuarantined(capabilityId)) {
      throw new Error(`PSOM: capability "${capabilityId}" is quarantined`);
    }

    const selection = this.loadBalancer.select(capabilityId);
    if (!selection) {
      throw new Error(`PSOM: no node available for capability "${capabilityId}"`);
    }

    const result = this.sendMessage(
      selection.node.nodeId,
      'capability',
      { capabilityId, input },
      traceId,
    );

    if (result.allowed) {
      this.loadBalancer.markSuccess(selection.node.nodeId);
    } else {
      this.loadBalancer.markFailure(selection.node.nodeId);
    }

    return { ...result, selection };
  }

  topology(): MeshTopology {
    const nodes = this.registry.list();
    const edges = nodes
      .filter((n: { nodeId: string }) => n.nodeId !== this.options.nodeId)
      .map((n: { nodeId: string }) => ({
        from: this.options.nodeId,
        to: n.nodeId,
        federationActive: true,
      }));

    return { nodes, edges, generatedAt: new Date().toISOString() };
  }
}
