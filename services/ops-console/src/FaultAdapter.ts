import { type FaultEvent } from '@aaes-os/aaes-governance';

export class FaultAdapter {
  constructor(private readonly faults: { getAll(): FaultEvent[] }) {}

  snapshot(): { faults: FaultEvent[]; count: number } {
    const items = this.faults.getAll();
    return {
      faults: items,
      count: items.length,
    };
  }
}
