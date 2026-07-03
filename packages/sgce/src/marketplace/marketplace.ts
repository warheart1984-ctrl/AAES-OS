import { randomBytes } from 'node:crypto';

import type { GovernanceMode } from '@aaes-os/platform-core';

import type { MarketplaceListing, PricingModel } from '../types.js';

export interface CreateListingInput {
  capabilityId: string;
  version: string;
  sellerId: string;
  title: string;
  description: string;
  pricingModel: PricingModel;
  priceUnits: number;
  governanceProfile: GovernanceMode;
}

/** Cross-organism capability marketplace with governance-aware listings. */
export class CapabilityMarketplace {
  private readonly listings = new Map<string, MarketplaceListing>();

  publish(input: CreateListingInput): MarketplaceListing {
    const listing: MarketplaceListing = {
      listingId: `lst_${randomBytes(6).toString('hex')}`,
      capabilityId: input.capabilityId,
      version: input.version,
      sellerId: input.sellerId,
      title: input.title,
      description: input.description,
      pricingModel: input.pricingModel,
      priceUnits: input.priceUnits,
      governanceProfile: input.governanceProfile,
      rating: 0,
      ratingCount: 0,
      publishedAt: new Date().toISOString(),
      active: true,
    };
    this.listings.set(listing.listingId, listing);
    return listing;
  }

  search(filter?: {
    capabilityId?: string;
    pricingModel?: PricingModel;
    governanceProfile?: GovernanceMode;
    minRating?: number;
  }): MarketplaceListing[] {
    return [...this.listings.values()].filter((l) => {
      if (!l.active) return false;
      if (filter?.capabilityId && l.capabilityId !== filter.capabilityId) return false;
      if (filter?.pricingModel && l.pricingModel !== filter.pricingModel) return false;
      if (filter?.governanceProfile && l.governanceProfile !== filter.governanceProfile) {
        return false;
      }
      if (filter?.minRating !== undefined && l.rating < filter.minRating) return false;
      return true;
    });
  }

  rate(listingId: string, score: number): MarketplaceListing {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error(`SGCE: listing "${listingId}" not found`);
    const clamped = Math.max(1, Math.min(5, score));
    listing.rating =
      (listing.rating * listing.ratingCount + clamped) / (listing.ratingCount + 1);
    listing.ratingCount += 1;
    return listing;
  }

  deactivate(listingId: string): void {
    const listing = this.listings.get(listingId);
    if (listing) listing.active = false;
  }
}
