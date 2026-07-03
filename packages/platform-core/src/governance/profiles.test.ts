import { describe, expect, it } from 'vitest';

import {
  assertBehaviorAllowed,
  getGovernanceProfile,
  listGovernanceProfiles,
  riskWithinThreshold,
} from './profiles.js';

describe('governance profiles', () => {
  it('lists all three modes', () => {
    expect(listGovernanceProfiles()).toHaveLength(3);
  });

  it('strict blocks mesh-share', () => {
    const strict = getGovernanceProfile('strict');
    expect(() => assertBehaviorAllowed(strict, 'mesh-share')).toThrow(/not allowed/);
  });

  it('experimental allows cross-organism routing', () => {
    const exp = getGovernanceProfile('experimental');
    expect(() => assertBehaviorAllowed(exp, 'cross-organism-route')).not.toThrow();
  });

  it('risk threshold ordering', () => {
    expect(riskWithinThreshold('low', 'medium')).toBe(true);
    expect(riskWithinThreshold('high', 'medium')).toBe(false);
  });
});
