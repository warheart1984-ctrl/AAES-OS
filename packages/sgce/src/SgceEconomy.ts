import { VersionRegistry } from '@aaes-os/platform-core';

import { CapabilityLifecycle } from './lifecycle/lifecycle.js';
import { CapabilityMarketplace } from './marketplace/marketplace.js';
import { ProvenanceTracker } from './provenance/lineage.js';
import { PricingEngine } from './pricing/pricing.js';
import { CapabilityTokenizer } from './tokens/tokenization.js';
import type { PublishCapabilityInput } from './lifecycle/lifecycle.js';

/** Unified SGCE orchestrator — tokenization, marketplace, provenance, and lifecycle. */
export class SgceEconomy {
  readonly registry = new VersionRegistry();
  readonly lifecycle: CapabilityLifecycle;
  readonly marketplace = new CapabilityMarketplace();
  readonly provenance = new ProvenanceTracker();
  readonly pricing = new PricingEngine();
  readonly tokens = new CapabilityTokenizer();

  constructor() {
    this.lifecycle = new CapabilityLifecycle(this.registry);
  }

  publishCapability(input: PublishCapabilityInput) {
    const lifecycle = this.lifecycle.publish(input);
    const provenance = this.provenance.record({
      capabilityId: input.id,
      version: input.version,
      publisherId: input.ownerId,
      governanceTags: input.governanceTags,
    });
    const token = this.tokens.mint({
      capabilityId: input.id,
      version: input.version,
      ownerId: input.ownerId,
      governanceProfile: input.governanceProfile,
    });
    const quote = this.pricing.quote(
      input.id,
      'subscription',
      10,
      input.governanceProfile,
    );

    return { lifecycle, provenance, token, quote };
  }
}
