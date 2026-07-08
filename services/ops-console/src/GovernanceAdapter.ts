import { DriftMetrics, type FaultEvent, type PatternRecord } from '@aaes-os/aaes-governance';

export interface GovernanceSnapshot {
  drift: ReturnType<DriftMetrics['computeDrift']>;
  faultCount: number;
}

export class GovernanceAdapter {
  constructor(
    private readonly faults: FaultEvent[],
    private readonly driftMetrics = new DriftMetrics(),
  ) {}

  snapshot(): GovernanceSnapshot {
    return {
      drift: this.driftMetrics.computeDrift(this.faults, [] as PatternRecord[]),
      faultCount: this.faults.length,
    };
  }
}
