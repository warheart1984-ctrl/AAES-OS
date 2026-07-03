import { describe, expect, it } from 'vitest';

import { PlatformService } from './PlatformService.js';

describe('PlatformService', () => {
  it('login, publish, invoke with billing', () => {
    const platform = new PlatformService();
    const session = platform.login('dev-1', 'balanced');
    expect(session.ownerId).toBe('dev-1');

    const ctx = { ownerId: 'dev-1', governanceProfile: 'balanced' as const, scopes: ['*'] };
    platform.publishCapability(ctx, {
      id: 'cap.demo',
      name: 'Demo',
      description: 'test',
      organId: 'organ-1',
      version: '1.0.0',
    });

    const result = platform.invokeCapability(ctx, {
      capabilityId: 'cap.demo',
      input: { hello: 'world' },
    });

    expect(result.governance.allowed).toBe(true);
    expect(result.billing.units).toBeGreaterThan(0);

    const usage = platform.meter.summary('dev-1');
    expect(usage.totalUnits).toBeGreaterThan(0);
  });
});
