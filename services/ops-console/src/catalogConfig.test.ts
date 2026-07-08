import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PROOF_SURFACE_CATALOG_URL,
  normalizeProofSurfaceCatalogUrl,
  resolveInitialProofSurfaceCatalogUrl,
} from './catalogConfig.js';

describe('catalogConfig', () => {
  it('defaults to the local proof-surface route when no value is provided', () => {
    expect(normalizeProofSurfaceCatalogUrl('')).toBe(DEFAULT_PROOF_SURFACE_CATALOG_URL);
    expect(normalizeProofSurfaceCatalogUrl(null)).toBe(DEFAULT_PROOF_SURFACE_CATALOG_URL);
  });

  it('prefers the query-string catalogUrl when present', () => {
    expect(resolveInitialProofSurfaceCatalogUrl('?catalogUrl=https%3A%2F%2Fexample.com%2Fproof-surfaces', null)).toBe(
      'https://example.com/proof-surfaces',
    );
  });

  it('falls back to the stored value when the query string is absent', () => {
    expect(resolveInitialProofSurfaceCatalogUrl('', 'https://stored.example/proof-surfaces')).toBe(
      'https://stored.example/proof-surfaces',
    );
  });
});
