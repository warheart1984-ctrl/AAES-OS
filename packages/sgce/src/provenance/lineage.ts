import type { ProvenanceRecord } from '../types.js';

export interface RecordProvenanceInput {
  capabilityId: string;
  version: string;
  publisherId: string;
  parentCapabilityId?: string;
  parentVersion?: string;
  governanceTags?: string[];
}

/** Capability provenance, lineage tracking, and trust scoring. */
export class ProvenanceTracker {
  private readonly records: ProvenanceRecord[] = [];

  record(input: RecordProvenanceInput): ProvenanceRecord {
    const parent = input.parentCapabilityId
      ? this.records.find((r) => r.capabilityId === input.parentCapabilityId)
      : undefined;

    const lineageDepth = parent ? parent.lineageDepth + 1 : 0;
    const trustScore = computeTrustScore(lineageDepth, parent?.trustScore, input.governanceTags ?? []);

    const entry: ProvenanceRecord = {
      capabilityId: input.capabilityId,
      version: input.version,
      publisherId: input.publisherId,
      parentCapabilityId: input.parentCapabilityId,
      parentVersion: input.parentVersion,
      lineageDepth,
      trustScore,
      governanceTags: input.governanceTags ?? [],
      recordedAt: new Date().toISOString(),
    };

    this.records.push(entry);
    return entry;
  }

  lineage(capabilityId: string): ProvenanceRecord[] {
    return this.records.filter(
      (r) => r.capabilityId === capabilityId || r.parentCapabilityId === capabilityId,
    );
  }

  trustScore(capabilityId: string, version?: string): number {
    const matches = this.records.filter(
      (r) => r.capabilityId === capabilityId && (!version || r.version === version),
    );
    if (matches.length === 0) return 0.5;
    return matches.reduce((sum, r) => sum + r.trustScore, 0) / matches.length;
  }

  all(): ProvenanceRecord[] {
    return [...this.records];
  }
}

function computeTrustScore(
  depth: number,
  parentTrust: number | undefined,
  tags: string[],
): number {
  let score = parentTrust ?? 0.7;
  score -= depth * 0.05;
  if (tags.includes('audited')) score += 0.1;
  if (tags.includes('certified')) score += 0.15;
  if (tags.includes('experimental')) score -= 0.1;
  return Math.max(0, Math.min(1, score));
}
