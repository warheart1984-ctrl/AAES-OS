import { assertBehaviorAllowed, getGovernanceProfile } from '../governance/profiles.js';
import { UsageMeter } from '../billing/meter.js';
import { VersionRegistry } from '../versioning/registry.js';
import type { ApiKeyRecord, InvokeRequest, InvokeResult } from '../types.js';

export type InvokeHandler = (
  capabilityId: string,
  version: string,
  input: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export class CapabilityInvoker {
  constructor(
    private readonly registry: VersionRegistry,
    private readonly meter: UsageMeter,
    private readonly handler: InvokeHandler = defaultHandler,
  ) {}

  async invoke(
    request: InvokeRequest,
    auth: ApiKeyRecord,
  ): Promise<InvokeResult> {
    const profile = getGovernanceProfile(auth.governanceProfile);
    assertBehaviorAllowed(profile, 'execute-approved');

    const cap = this.registry.get(request.capabilityId);
    if (!cap) {
      throw new Error(`INVOKE: capability "${request.capabilityId}" not found`);
    }

    const version = request.version ?? cap.currentVersion;
    const versionEntry = this.registry.getVersion(request.capabilityId, version);
    if (!versionEntry) {
      throw new Error(`INVOKE: version "${version}" not found for ${request.capabilityId}`);
    }

    const violations: string[] = [];
    for (const invariant of versionEntry.compatibility.requiredInvariants) {
      if (!profile.invariantSets.includes(invariant)) {
        violations.push(`missing invariant: ${invariant}`);
      }
    }

    const allowed = violations.length === 0;
    let output: Record<string, unknown> = {};

    if (allowed) {
      output = await this.handler(request.capabilityId, version, request.input);
    }

    const units = this.meter.computeUnits('capability:invoke', 1, auth.governanceProfile);
    this.meter.record({
      ownerId: auth.ownerId,
      capabilityId: request.capabilityId,
      operation: 'capability:invoke',
      units,
      governanceProfile: auth.governanceProfile,
      metadata: { version, traceId: request.traceId, allowed },
    });

    return {
      capabilityId: request.capabilityId,
      version,
      output,
      governance: { profile: auth.governanceProfile, violations, allowed },
      billing: { units, operation: 'capability:invoke' },
    };
  }
}

async function defaultHandler(
  capabilityId: string,
  version: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return {
    echo: true,
    capabilityId,
    version,
    received: input,
    processedAt: new Date().toISOString(),
  };
}
