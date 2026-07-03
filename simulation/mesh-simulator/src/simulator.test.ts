import { describe, expect, it } from 'vitest';

import { MeshSimulator, runLoadStress } from './simulator.js';

describe('MeshSimulator', () => {
  it('runs multi-organism simulation', () => {
    const sim = new MeshSimulator({ organismCount: 3, messagesPerOrganism: 5 });
    sim.setup();
    const report = sim.run();
    expect(report.organisms).toBe(3);
    expect(report.messagesSent).toBeGreaterThan(0);
    expect(report.capabilitiesPublished).toBe(3);
  });

  it('load stress completes', () => {
    const report = runLoadStress();
    expect(report.durationMs).toBeGreaterThan(0);
  });
});
