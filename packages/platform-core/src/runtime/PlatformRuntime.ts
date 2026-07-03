import { ApiKeyStore } from '../auth/apiKeys.js';
import { UsageMeter } from '../billing/meter.js';
import { CapabilityInvoker } from '../capabilities/invoke.js';
import { VersionRegistry } from '../versioning/registry.js';
import type { GovernanceMode } from '../types.js';

export interface PlatformRuntimeOptions {
  nodeId?: string;
}

/** Unified runtime shell for auth, versioning, billing, and capability invocation. */
export class PlatformRuntime {
  readonly nodeId: string;
  readonly apiKeys = new ApiKeyStore();
  readonly meter = new UsageMeter();
  readonly registry = new VersionRegistry();
  readonly invoker: CapabilityInvoker;

  constructor(options: PlatformRuntimeOptions = {}) {
    this.nodeId = options.nodeId ?? `node_${Date.now().toString(36)}`;
    this.invoker = new CapabilityInvoker(this.registry, this.meter);
  }

  createApiKey(
    label: string,
    ownerId: string,
    governanceProfile: GovernanceMode = 'balanced',
  ) {
    return this.apiKeys.create({ label, ownerId, governanceProfile });
  }

  authenticate(key: string) {
    return this.apiKeys.authenticate(key);
  }
}
