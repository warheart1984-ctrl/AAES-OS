#!/usr/bin/env tsx
import { runGovernanceDriftStress, runLoadStress } from './simulator.js';

const scenario = process.argv[2] ?? 'all';

console.log('=== PSOM Mesh Simulator ===\n');

if (scenario === 'load' || scenario === 'all') {
  const load = runLoadStress();
  console.log('Load stress scenario:');
  console.log(JSON.stringify(load, null, 2));
  console.log();
}

if (scenario === 'governance-drift' || scenario === 'all') {
  const drift = runGovernanceDriftStress();
  console.log('Governance drift scenario:');
  console.log(JSON.stringify(drift, null, 2));
}
