import type { CognitiveRisk } from '@aaes-os/governed-runtime';

import { ApiKeyStore } from './auth/apiKeys.js';
import { UsageMeter } from './billing/meter.js';
import {
  assertApiAccess,
  assertBehaviorAllowed,
  getGovernanceProfile,
  listGovernanceProfiles,
} from './governance/profiles.js';
import type {
  CapabilityRecord,
  GovernanceMode,
  InvokeRequest,
  InvokeResult,
} from './types.js';
import { VersionRegistry } from './versioning/registry.js';

export interface PlatformContext {
  ownerId: string;
  governanceProfile: GovernanceMode;
  scopes: string[];
}

export class PlatformService {
  readonly apiKeys = new ApiKeyStore();
  readonly versions = new VersionRegistry();
  readonly meter = new UsageMeter();

  authenticateApiKey(key: string): PlatformContext {
    const record = this.apiKeys.authenticate(key);
    return {
      ownerId: record.ownerId,
      governanceProfile: record.governanceProfile,
      scopes: record.scopes,
    };
  }

  login(ownerId: string, governanceProfile: GovernanceMode = 'balanced') {
    return this.apiKeys.login(ownerId, governanceProfile);
  }

  listProfiles() {
    return listGovernanceProfiles();
  }

  publishCapability(
    ctx: PlatformContext,
    input: {
      id: string;
      name: string;
      description: string;
      organId: string;
      version: string;
      changelog?: string;
      maxRisk?: CognitiveRisk;
      requiredInvariants?: string[];
    },
  ): CapabilityRecord {
    assertBehaviorAllowed(getGovernanceProfile(ctx.governanceProfile), 'publish-capability');
    assertApiAccess(getGovernanceProfile(ctx.governanceProfile), 'standard');

    const profile = getGovernanceProfile(ctx.governanceProfile);
    return this.versions.publish({
      id: input.id,
      name: input.name,
      description: input.description,
      organId: input.organId,
      ownerId: ctx.ownerId,
      governanceProfile: ctx.governanceProfile,
      version: input.version,
      changelog: input.changelog,
      compatibility: {
        minPlatform: '0.1.0',
        maxRisk: input.maxRisk ?? profile.riskThreshold,
        requiredInvariants: input.requiredInvariants ?? profile.invariantSets,
      },
    });
  }

  invokeCapability(ctx: PlatformContext, req: InvokeRequest): InvokeResult {
    const cap = this.versions.get(req.capabilityId);
    if (!cap) {
      throw new Error(`PLATFORM: capability "${req.capabilityId}" not found`);
    }

    const version = req.version ?? cap.currentVersion;
    const versionEntry = this.versions.getVersion(req.capabilityId, version);
    if (!versionEntry) {
      throw new Error(`PLATFORM: version "${version}" not found for ${req.capabilityId}`);
    }

    const profile = getGovernanceProfile(ctx.governanceProfile);
    const check = this.versions.checkCompatibility(
      req.capabilityId,
      cap.currentVersion,
      version,
      ctx.governanceProfile,
      profile.riskThreshold,
    );

    const violations = [...check.reasons];
    if (!check.compatible) {
      if (ctx.governanceProfile === 'strict') {
        throw new Error(`PLATFORM: invoke blocked — ${violations.join('; ')}`);
      }
    }

    const units = this.meter.computeUnits('capability:invoke', 1, ctx.governanceProfile);
    this.meter.record({
      ownerId: ctx.ownerId,
      capabilityId: req.capabilityId,
      operation: 'capability:invoke',
      units,
      governanceProfile: ctx.governanceProfile,
      metadata: { version, traceId: req.traceId },
    });

    return {
      capabilityId: req.capabilityId,
      version,
      output: {
        status: 'ok',
        echo: req.input,
        executedAt: new Date().toISOString(),
      },
      governance: {
        profile: ctx.governanceProfile,
        violations,
        allowed: check.compatible,
      },
      billing: {
        units,
        operation: 'capability:invoke',
      },
    };
  }

  testModule(
    ctx: PlatformContext,
    moduleId: string,
    version: string,
  ): { passed: boolean; checks: string[] } {
    assertApiAccess(getGovernanceProfile(ctx.governanceProfile), 'standard');
    const cap = this.versions.get(moduleId);
    const checks: string[] = [];

    if (!cap) {
      return { passed: false, checks: [`module "${moduleId}" not registered`] };
    }

    const v = this.versions.getVersion(moduleId, version);
    if (!v) {
      checks.push(`version ${version} not found`);
    } else {
      checks.push(`version ${version} resolved`);
      checks.push(`organ ${v.organId} linked`);
    }

    const compat = this.versions.checkCompatibility(
      moduleId,
      cap.currentVersion,
      version,
      ctx.governanceProfile,
    );
    checks.push(...compat.reasons.map((r: string) => `compat: ${r}`));
    if (compat.compatible) checks.push('compatibility check passed');

    const units = this.meter.computeUnits('module:test', 1, ctx.governanceProfile);
    this.meter.record({
      ownerId: ctx.ownerId,
      capabilityId: moduleId,
      operation: 'module:test',
      units,
      governanceProfile: ctx.governanceProfile,
    });

    return { passed: compat.compatible && !!v, checks };
  }
}
