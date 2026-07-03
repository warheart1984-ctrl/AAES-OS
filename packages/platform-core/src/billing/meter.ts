import type { GovernanceMode, UsageRecord } from '../types.js';

export interface BillingHook {
  onUsage(record: UsageRecord): void | Promise<void>;
}

export interface MeterOptions {
  hooks?: BillingHook[];
}

const TIER_MULTIPLIERS: Record<GovernanceMode, number> = {
  strict: 2.0,
  balanced: 1.0,
  experimental: 0.5,
};

export class UsageMeter {
  private readonly records: UsageRecord[] = [];
  private readonly hooks: BillingHook[];

  constructor(options: MeterOptions = {}) {
    this.hooks = options.hooks ?? [];
  }

  record(input: Omit<UsageRecord, 'id' | 'timestamp'>): UsageRecord {
    const entry: UsageRecord = {
      ...input,
      id: `usage_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.records.push(entry);
    for (const hook of this.hooks) {
      void hook.onUsage(entry);
    }
    return entry;
  }

  computeUnits(
    operation: string,
    baseUnits: number,
    governanceProfile: GovernanceMode,
  ): number {
    const multiplier = TIER_MULTIPLIERS[governanceProfile];
    const opFactor = operation.includes('invoke') ? 1 : operation.includes('mesh') ? 1.5 : 0.25;
    return Math.ceil(baseUnits * multiplier * opFactor);
  }

  summary(ownerId: string): {
    totalUnits: number;
    byOperation: Record<string, number>;
    byProfile: Record<GovernanceMode, number>;
  } {
    const filtered = this.records.filter((r) => r.ownerId === ownerId);
    const byOperation: Record<string, number> = {};
    const byProfile: Record<GovernanceMode, number> = {
      strict: 0,
      balanced: 0,
      experimental: 0,
    };
    let totalUnits = 0;

    for (const r of filtered) {
      totalUnits += r.units;
      byOperation[r.operation] = (byOperation[r.operation] ?? 0) + r.units;
      byProfile[r.governanceProfile] += r.units;
    }

    return { totalUnits, byOperation, byProfile };
  }

  allRecords(): UsageRecord[] {
    return [...this.records];
  }
}
