import { createHash, randomBytes } from 'node:crypto';

import { PatternLedger } from '@aaes-os/aaes-governance';
import { FederationManager, type FederationContract } from '@aaes-os/federation';
import {
  assertBehaviorAllowed,
  getGovernanceProfile,
  type GovernanceMode,
} from '@aaes-os/platform-core';
import { AuthorityLevel, SovrenAuthority, type AuthToken } from '@aaes-os/sovren';

export interface OrganismDescriptor {
  organismId: string;
  endpoint: string;
  capabilities: string[];
  governanceProfile: GovernanceMode;
  lawHash: string;
  lastSeen: string;
}

export interface MeshConnection {
  connectionId: string;
  localOrganismId: string;
  remoteOrganismId: string;
  federation: FederationContract;
  status: 'pending' | 'active' | 'revoked';
  sharedCapabilities: string[];
  connectedAt?: string;
}

export interface MeshMessage {
  messageId: string;
  fromOrganismId: string;
  toOrganismId: string;
  payload: Record<string, unknown>;
  governanceProfile: GovernanceMode;
  signature: string;
  sentAt: string;
}

export interface WorkflowRouteRequest {
  workflowId: string;
  steps: Array<{
    organismId: string;
    capabilityId: string;
    input: Record<string, unknown>;
  }>;
  governanceProfile: GovernanceMode;
}

export interface WorkflowRouteResult {
  workflowId: string;
  results: Array<{
    organismId: string;
    capabilityId: string;
    output: Record<string, unknown>;
    governed: boolean;
  }>;
}

export class MeshNetwork {
  private readonly organisms = new Map<string, OrganismDescriptor>();
  private readonly connections = new Map<string, MeshConnection>();
  private readonly federation: FederationManager;

  constructor(
    private readonly localOrganismId: string,
    private readonly lawHash: string,
    readonly sovren: SovrenAuthority,
    private readonly ledger: PatternLedger,
  ) {
    this.federation = new FederationManager(localOrganismId, lawHash, sovren, ledger);
    this.registerLocal({
      endpoint: `http://localhost/organisms/${localOrganismId}`,
      capabilities: [],
      governanceProfile: 'balanced',
    });
  }

  registerLocal(input: {
    endpoint: string;
    capabilities: string[];
    governanceProfile: GovernanceMode;
  }): OrganismDescriptor {
    const descriptor: OrganismDescriptor = {
      organismId: this.localOrganismId,
      endpoint: input.endpoint,
      capabilities: input.capabilities,
      governanceProfile: input.governanceProfile,
      lawHash: this.lawHash,
      lastSeen: new Date().toISOString(),
    };
    this.organisms.set(this.localOrganismId, descriptor);
    return descriptor;
  }

  announce(input: Omit<OrganismDescriptor, 'lastSeen'>): OrganismDescriptor {
    const descriptor: OrganismDescriptor = { ...input, lastSeen: new Date().toISOString() };
    this.organisms.set(input.organismId, descriptor);
    this.ledger.append({
      envelope_id: `mesh_ann_${input.organismId}`,
      trace_id: `mesh_ann_${input.organismId}`,
      delta_hash: createHash('sha256').update(JSON.stringify(descriptor)).digest('hex'),
      action: 'MESH_ANNOUNCE',
      actor_id: input.organismId,
      verdict_class: 'OPERATIONAL',
    });
    return descriptor;
  }

  discover(filter?: { capability?: string; governanceProfile?: GovernanceMode }): OrganismDescriptor[] {
    let results = [...this.organisms.values()];
    if (filter?.capability) {
      results = results.filter((o) => o.capabilities.includes(filter.capability!));
    }
    if (filter?.governanceProfile) {
      results = results.filter((o) => o.governanceProfile === filter.governanceProfile);
    }
    return results.sort((a, b) => a.organismId.localeCompare(b.organismId));
  }

  connect(
    remote: OrganismDescriptor,
    scope: string[],
    sovereignRootToken: AuthToken,
    governanceProfile: GovernanceMode,
  ): MeshConnection {
    const profile = getGovernanceProfile(governanceProfile);
    assertBehaviorAllowed(profile, 'mesh-share');

    const contract = this.federation.initiate(remote.organismId, scope, sovereignRootToken);
    const connectionId = `conn_${randomBytes(8).toString('hex')}`;
    const connection: MeshConnection = {
      connectionId,
      localOrganismId: this.localOrganismId,
      remoteOrganismId: remote.organismId,
      federation: contract,
      status: 'pending',
      sharedCapabilities: [],
    };
    this.connections.set(connectionId, connection);
    return connection;
  }

  acceptConnection(
    connection: MeshConnection,
    sovereignRootToken: AuthToken,
  ): MeshConnection {
    const activeContract = this.federation.accept(connection.federation, sovereignRootToken);
    const active: MeshConnection = {
      ...connection,
      federation: activeContract,
      status: 'active',
      connectedAt: new Date().toISOString(),
    };
    this.connections.set(connection.connectionId, active);
    return active;
  }

  shareCapability(
    connectionId: string,
    capabilityId: string,
    governanceProfile: GovernanceMode,
    sovereignRootToken: AuthToken,
  ): MeshConnection {
    this.sovren.authorize(sovereignRootToken, AuthorityLevel.SOVEREIGN_ROOT);
    const profile = getGovernanceProfile(governanceProfile);
    assertBehaviorAllowed(profile, 'mesh-share');

    const conn = this.connections.get(connectionId);
    if (!conn || conn.status !== 'active') {
      throw new Error(`MESH: connection "${connectionId}" not active`);
    }

    const updated: MeshConnection = {
      ...conn,
      sharedCapabilities: [...new Set([...conn.sharedCapabilities, capabilityId])],
    };
    this.connections.set(connectionId, updated);

    this.ledger.append({
      envelope_id: `mesh_share_${connectionId}_${capabilityId}`,
      trace_id: connectionId,
      delta_hash: createHash('sha256').update(capabilityId).digest('hex'),
      action: 'MESH_SHARE_CAPABILITY',
      actor_id: this.localOrganismId,
      verdict_class: 'IRREVERSIBLE',
      meta: { capabilityId, remote: conn.remoteOrganismId },
    });

    return updated;
  }

  sendMessage(
    toOrganismId: string,
    payload: Record<string, unknown>,
    governanceProfile: GovernanceMode,
    sovereignRootToken: AuthToken,
  ): MeshMessage {
    this.sovren.authorize(sovereignRootToken, AuthorityLevel.SOVEREIGN_ROOT);
    const profile = getGovernanceProfile(governanceProfile);

    const activeConn = [...this.connections.values()].find(
      (c) => c.remoteOrganismId === toOrganismId && c.status === 'active',
    );
    if (!activeConn) {
      throw new Error(`MESH: no active connection to "${toOrganismId}"`);
    }

    const messageId = `msg_${randomBytes(8).toString('hex')}`;
    const envelope = { messageId, from: this.localOrganismId, to: toOrganismId, payload };
    const message: MeshMessage = {
      messageId,
      fromOrganismId: this.localOrganismId,
      toOrganismId,
      payload,
      governanceProfile,
      signature: this.sovren.signEnvelope(envelope),
      sentAt: new Date().toISOString(),
    };

    this.ledger.append({
      envelope_id: messageId,
      trace_id: messageId,
      delta_hash: createHash('sha256').update(JSON.stringify(message)).digest('hex'),
      action: 'MESH_MESSAGE',
      actor_id: this.localOrganismId,
      verdict_class: 'OPERATIONAL',
      meta: {
        to: toOrganismId,
        invariantSets: profile.invariantSets,
      },
    });

    return message;
  }

  routeWorkflow(req: WorkflowRouteRequest, sovereignRootToken: AuthToken): WorkflowRouteResult {
    this.sovren.authorize(sovereignRootToken, AuthorityLevel.SOVEREIGN_ROOT);
    const profile = getGovernanceProfile(req.governanceProfile);
    assertBehaviorAllowed(profile, 'cross-organism-route');

    const results: WorkflowRouteResult['results'] = [];
    for (const step of req.steps) {
      const organism = this.organisms.get(step.organismId);
      if (!organism) {
        throw new Error(`MESH: organism "${step.organismId}" not discovered`);
      }
      if (!organism.capabilities.includes(step.capabilityId)) {
        throw new Error(
          `MESH: capability "${step.capabilityId}" not available on ${step.organismId}`,
        );
      }

      results.push({
        organismId: step.organismId,
        capabilityId: step.capabilityId,
        output: {
          routed: true,
          workflowId: req.workflowId,
          input: step.input,
          executedAt: new Date().toISOString(),
        },
        governed: true,
      });
    }

    this.ledger.append({
      envelope_id: `wf_${req.workflowId}`,
      trace_id: req.workflowId,
      delta_hash: createHash('sha256').update(JSON.stringify(req)).digest('hex'),
      action: 'MESH_ROUTE_WORKFLOW',
      actor_id: this.localOrganismId,
      verdict_class: 'IRREVERSIBLE',
    });

    return { workflowId: req.workflowId, results };
  }

  listConnections(): MeshConnection[] {
    return [...this.connections.values()];
  }
}
