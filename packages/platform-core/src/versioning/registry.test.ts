import { describe, expect, it } from 'vitest';

import { VersionRegistry } from './registry.js';
import { compareVersionStrings, isDowngrade, isUpgrade } from './semver.js';

describe('semver', () => {
  it('compares versions correctly', () => {
    expect(compareVersionStrings('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(isUpgrade('1.0.0', '2.0.0')).toBe(true);
    expect(isDowngrade('2.0.0', '1.0.0')).toBe(true);
  });
});

describe('VersionRegistry', () => {
  it('publishes and upgrades capabilities', () => {
    const registry = new VersionRegistry();
    registry.publish({
      id: 'mod.test',
      name: 'Test Module',
      description: 'demo',
      organId: 'organ-1',
      ownerId: 'dev-1',
      governanceProfile: 'balanced',
      version: '1.0.0',
      compatibility: {
        minPlatform: '0.1.0',
        maxRisk: 'medium',
        requiredInvariants: ['core-safety'],
      },
    });

    registry.publish({
      id: 'mod.test',
      name: 'Test Module',
      description: 'demo',
      organId: 'organ-1',
      ownerId: 'dev-1',
      governanceProfile: 'balanced',
      version: '1.1.0',
      compatibility: {
        minPlatform: '0.1.0',
        maxRisk: 'medium',
        requiredInvariants: ['core-safety'],
      },
    });

    expect(registry.get('mod.test')!.currentVersion).toBe('1.1.0');

    registry.downgrade('mod.test', '1.0.0', 'balanced');
    const upgraded = registry.upgrade('mod.test', '1.1.0', 'balanced');
    expect(upgraded.currentVersion).toBe('1.1.0');
  });

  it('blocks strict major downgrades', () => {
    const registry = new VersionRegistry();
    registry.publish({
      id: 'mod.down',
      name: 'Down',
      description: 'demo',
      organId: 'organ-1',
      ownerId: 'dev-1',
      governanceProfile: 'balanced',
      version: '2.0.0',
      compatibility: {
        minPlatform: '0.1.0',
        maxRisk: 'medium',
        requiredInvariants: ['core-safety'],
      },
    });
    registry.publish({
      id: 'mod.down',
      name: 'Down',
      description: 'demo',
      organId: 'organ-1',
      ownerId: 'dev-1',
      governanceProfile: 'balanced',
      version: '1.0.0',
      compatibility: {
        minPlatform: '0.1.0',
        maxRisk: 'medium',
        requiredInvariants: ['core-safety'],
      },
    });

    registry.upgrade('mod.down', '2.0.0', 'balanced');
    expect(() => registry.downgrade('mod.down', '1.0.0', 'strict')).toThrow(/blocked/);
  });
});
