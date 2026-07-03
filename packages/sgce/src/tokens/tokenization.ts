import { randomBytes } from 'node:crypto';

import type { GovernanceMode } from '@aaes-os/platform-core';

import type { CapabilityToken } from '../types.js';

export interface MintTokenInput {
  capabilityId: string;
  version: string;
  ownerId: string;
  governanceProfile: GovernanceMode;
  units?: number;
  metadata?: Record<string, unknown>;
}

/** Non-financial capability tokenization — governance-tracked entitlement units. */
export class CapabilityTokenizer {
  private readonly tokens = new Map<string, CapabilityToken>();

  mint(input: MintTokenInput): CapabilityToken {
    const token: CapabilityToken = {
      tokenId: `tok_${randomBytes(8).toString('hex')}`,
      capabilityId: input.capabilityId,
      version: input.version,
      ownerId: input.ownerId,
      issuedAt: new Date().toISOString(),
      governanceProfile: input.governanceProfile,
      units: input.units ?? 100,
      metadata: input.metadata,
    };
    this.tokens.set(token.tokenId, token);
    return token;
  }

  transfer(tokenId: string, newOwnerId: string): CapabilityToken {
    const token = this.tokens.get(tokenId);
    if (!token) throw new Error(`SGCE: token "${tokenId}" not found`);
    token.ownerId = newOwnerId;
    return token;
  }

  consume(tokenId: string, units: number): CapabilityToken {
    const token = this.tokens.get(tokenId);
    if (!token) throw new Error(`SGCE: token "${tokenId}" not found`);
    if (token.units < units) {
      throw new Error(`SGCE: insufficient token units (${token.units} < ${units})`);
    }
    token.units -= units;
    return token;
  }

  list(ownerId?: string): CapabilityToken[] {
    const all = [...this.tokens.values()];
    return ownerId ? all.filter((t) => t.ownerId === ownerId) : all;
  }
}
