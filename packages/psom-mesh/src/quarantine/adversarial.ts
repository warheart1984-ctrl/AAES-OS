import type { QuarantineRecord } from '../types.js';

export interface QuarantineInput {
  capabilityId: string;
  sourceNodeId: string;
  reason: string;
  trustScore: number;
}

/** Adversarial capability quarantine — isolates untrusted capabilities across the mesh. */
export class AdversarialQuarantine {
  private readonly records = new Map<string, QuarantineRecord>();

  quarantine(input: QuarantineInput): QuarantineRecord {
    const record: QuarantineRecord = {
      capabilityId: input.capabilityId,
      sourceNodeId: input.sourceNodeId,
      reason: input.reason,
      quarantinedAt: new Date().toISOString(),
      trustScoreAtQuarantine: input.trustScore,
    };
    this.records.set(input.capabilityId, record);
    return record;
  }

  isQuarantined(capabilityId: string): boolean {
    return this.records.has(capabilityId);
  }

  release(capabilityId: string): void {
    this.records.delete(capabilityId);
  }

  list(): QuarantineRecord[] {
    return [...this.records.values()];
  }
}
