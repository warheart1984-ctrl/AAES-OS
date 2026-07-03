import { describe, expect, it } from 'vitest';

import { SgceEconomy } from './SgceEconomy.js';

describe('SgceEconomy', () => {
  it('publishes capability with token and provenance', () => {
    const sgce = new SgceEconomy();
    const result = sgce.publishCapability({
      id: 'cap.test',
      name: 'Test Capability',
      description: 'A test capability',
      organId: 'organ-1',
      ownerId: 'owner-1',
      version: '1.0.0',
      governanceProfile: 'balanced',
      governanceTags: ['audited'],
    });

    expect(result.lifecycle.state).toBe('published');
    expect(result.token.capabilityId).toBe('cap.test');
    expect(result.provenance.trustScore).toBeGreaterThan(0.5);
    expect(result.quote.totalUnits).toBeGreaterThan(0);
  });

  it('lists marketplace entries', () => {
    const sgce = new SgceEconomy();
    sgce.marketplace.publish({
      capabilityId: 'cap.market',
      version: '1.0.0',
      sellerId: 'seller-1',
      title: 'Market Cap',
      description: 'For sale',
      pricingModel: 'rental',
      priceUnits: 5,
      governanceProfile: 'balanced',
    });

    expect(sgce.marketplace.search().length).toBe(1);
  });
});
