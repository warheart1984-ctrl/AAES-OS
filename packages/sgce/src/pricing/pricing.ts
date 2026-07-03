import type { GovernanceMode } from '@aaes-os/platform-core';

import type { PricingModel } from '../types.js';

export interface PriceQuote {
  capabilityId: string;
  pricingModel: PricingModel;
  baseUnits: number;
  governanceMultiplier: number;
  totalUnits: number;
}

const GOVERNANCE_MULTIPLIERS: Record<GovernanceMode, number> = {
  strict: 2.0,
  balanced: 1.0,
  experimental: 0.6,
};

const MODEL_MULTIPLIERS: Record<PricingModel, number> = {
  free: 0,
  rental: 1,
  subscription: 0.7,
  federation: 1.5,
};

/** Capability rental, subscription, and federation pricing calculator. */
export class PricingEngine {
  quote(
    capabilityId: string,
    pricingModel: PricingModel,
    baseUnits: number,
    governanceProfile: GovernanceMode,
  ): PriceQuote {
    const governanceMultiplier = GOVERNANCE_MULTIPLIERS[governanceProfile];
    const modelMultiplier = MODEL_MULTIPLIERS[pricingModel];
    const totalUnits = Math.ceil(baseUnits * governanceMultiplier * modelMultiplier);

    return {
      capabilityId,
      pricingModel,
      baseUnits,
      governanceMultiplier,
      totalUnits,
    };
  }
}
