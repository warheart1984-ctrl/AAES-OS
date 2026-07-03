import type { CognitiveRisk } from '@aaes-os/governed-runtime';

import type {
  CapabilityRecord,
  CapabilityVersion,
  CompatibilityResult,
  GovernanceMode,
} from '../types.js';
import { getGovernanceProfile, riskWithinThreshold } from '../governance/profiles.js';
import { compareVersionStrings, isDowngrade, isUpgrade, parseSemVer } from './semver.js';

export class VersionRegistry {
  private readonly capabilities = new Map<string, CapabilityRecord>();

  publish(
    record: Omit<CapabilityRecord, 'createdAt' | 'updatedAt' | 'versions' | 'currentVersion'> & {
      version: string;
      changelog?: string;
      compatibility: CapabilityVersion['compatibility'];
    },
  ): CapabilityRecord {
    parseSemVer(record.version);

    const now = new Date().toISOString();
    const versionEntry: CapabilityVersion = {
      version: record.version,
      semver: parseSemVer(record.version),
      moduleId: record.id,
      organId: record.organId,
      publishedAt: now,
      changelog: record.changelog,
      compatibility: record.compatibility,
    };

    const existing = this.capabilities.get(record.id);
    if (existing) {
      const dup = existing.versions.find((v) => v.version === record.version);
      if (dup) {
        throw new Error(`VERSION: ${record.id}@${record.version} already published`);
      }
      const updated: CapabilityRecord = {
        ...existing,
        name: record.name,
        description: record.description,
        governanceProfile: record.governanceProfile,
        currentVersion: record.version,
        versions: [...existing.versions, versionEntry].sort((a, b) =>
          compareVersionStrings(a.version, b.version),
        ),
        updatedAt: now,
      };
      this.capabilities.set(record.id, updated);
      return updated;
    }

    const created: CapabilityRecord = {
      id: record.id,
      name: record.name,
      description: record.description,
      organId: record.organId,
      ownerId: record.ownerId,
      currentVersion: record.version,
      versions: [versionEntry],
      governanceProfile: record.governanceProfile,
      createdAt: now,
      updatedAt: now,
    };
    this.capabilities.set(record.id, created);
    return created;
  }

  get(id: string): CapabilityRecord | undefined {
    return this.capabilities.get(id);
  }

  list(): CapabilityRecord[] {
    return [...this.capabilities.values()];
  }

  getVersion(id: string, version: string): CapabilityVersion | undefined {
    return this.capabilities.get(id)?.versions.find((v) => v.version === version);
  }

  checkCompatibility(
    capabilityId: string,
    sourceVersion: string,
    targetVersion: string,
    profile: GovernanceMode,
    risk: CognitiveRisk = 'low',
  ): CompatibilityResult {
    const cap = this.capabilities.get(capabilityId);
    const reasons: string[] = [];

    if (!cap) {
      return {
        compatible: false,
        reasons: [`capability "${capabilityId}" not found`],
        sourceVersion,
        targetVersion,
      };
    }

    const source = cap.versions.find((v) => v.version === sourceVersion);
    const target = cap.versions.find((v) => v.version === targetVersion);

    if (!source) reasons.push(`source version ${sourceVersion} not found`);
    if (!target) reasons.push(`target version ${targetVersion} not found`);
    if (target?.deprecated) reasons.push(`target version ${targetVersion} is deprecated`);

    const gov = getGovernanceProfile(profile);
    for (const invariant of target?.compatibility.requiredInvariants ?? []) {
      if (!gov.invariantSets.includes(invariant)) {
        reasons.push(`governance profile missing required invariant: ${invariant}`);
      }
    }

    if (target && !riskWithinThreshold(risk, target.compatibility.maxRisk)) {
      reasons.push(
        `risk ${risk} exceeds target max risk ${target.compatibility.maxRisk}`,
      );
    }

    if (isDowngrade(sourceVersion, targetVersion)) {
      const majorDrop =
        parseSemVer(sourceVersion).major > parseSemVer(targetVersion).major;
      if (majorDrop && profile === 'strict') {
        reasons.push('strict profile blocks major version downgrades');
      }
    }

    return {
      compatible: reasons.length === 0,
      reasons,
      sourceVersion,
      targetVersion,
    };
  }

  upgrade(capabilityId: string, targetVersion: string, profile: GovernanceMode): CapabilityRecord {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) throw new Error(`VERSION: capability "${capabilityId}" not found`);

    const check = this.checkCompatibility(
      capabilityId,
      cap.currentVersion,
      targetVersion,
      profile,
    );
    if (!check.compatible) {
      throw new Error(`VERSION: upgrade blocked — ${check.reasons.join('; ')}`);
    }
    if (!isUpgrade(cap.currentVersion, targetVersion)) {
      throw new Error(
        `VERSION: ${targetVersion} is not an upgrade from ${cap.currentVersion}`,
      );
    }

    const updated = { ...cap, currentVersion: targetVersion, updatedAt: new Date().toISOString() };
    this.capabilities.set(capabilityId, updated);
    return updated;
  }

  downgrade(capabilityId: string, targetVersion: string, profile: GovernanceMode): CapabilityRecord {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) throw new Error(`VERSION: capability "${capabilityId}" not found`);

    const check = this.checkCompatibility(
      capabilityId,
      cap.currentVersion,
      targetVersion,
      profile,
    );
    if (!check.compatible) {
      throw new Error(`VERSION: downgrade blocked — ${check.reasons.join('; ')}`);
    }
    if (!isDowngrade(cap.currentVersion, targetVersion)) {
      throw new Error(
        `VERSION: ${targetVersion} is not a downgrade from ${cap.currentVersion}`,
      );
    }

    const updated = { ...cap, currentVersion: targetVersion, updatedAt: new Date().toISOString() };
    this.capabilities.set(capabilityId, updated);
    return updated;
  }
}
