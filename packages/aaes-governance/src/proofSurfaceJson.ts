import {
  createProofSurface,
  type ProofSurface,
  type ProofSurfaceValidationResult,
  validateProofSurface,
} from './proofSurface.js';

export const PROOF_SURFACE_JSON_SCHEMA_VERSION = '1.0';

export interface ProofSurfaceDocument {
  schemaVersion: typeof PROOF_SURFACE_JSON_SCHEMA_VERSION;
  generatedAt: string;
  surface: ProofSurface;
}

export interface ProofSurfaceCatalogDocument {
  schemaVersion: typeof PROOF_SURFACE_JSON_SCHEMA_VERSION;
  generatedAt: string;
  surfaces: ProofSurfaceDocument[];
}

export interface ProofSurfaceSnapshot {
  document: ProofSurfaceDocument;
  validation: ProofSurfaceValidationResult;
}

export const PROOF_SURFACE_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'CIEMS Proof Surface Document',
  type: 'object',
  required: ['schemaVersion', 'generatedAt', 'surface'],
  properties: {
    schemaVersion: { const: PROOF_SURFACE_JSON_SCHEMA_VERSION },
    generatedAt: { type: 'string', format: 'date-time' },
    surface: { type: 'object' },
  },
  additionalProperties: false,
} as const;

export const PROOF_SURFACE_CATALOG_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'CIEMS Proof Surface Catalog',
  type: 'object',
  required: ['schemaVersion', 'generatedAt', 'surfaces'],
  properties: {
    schemaVersion: { const: PROOF_SURFACE_JSON_SCHEMA_VERSION },
    generatedAt: { type: 'string', format: 'date-time' },
    surfaces: { type: 'array', items: PROOF_SURFACE_JSON_SCHEMA },
  },
  additionalProperties: false,
} as const;

export function createProofSurfaceDocument(surface: ProofSurface, generatedAt = new Date().toISOString()): ProofSurfaceDocument {
  return {
    schemaVersion: PROOF_SURFACE_JSON_SCHEMA_VERSION,
    generatedAt,
    surface: createProofSurface(surface),
  };
}

export function serializeProofSurfaceDocument(surface: ProofSurface, generatedAt = new Date().toISOString()): string {
  return JSON.stringify(createProofSurfaceDocument(surface, generatedAt), null, 2);
}

export function parseProofSurfaceDocument(value: string | ProofSurfaceDocument): ProofSurfaceDocument {
  const document = typeof value === 'string' ? JSON.parse(value) as ProofSurfaceDocument : value;
  if (document.schemaVersion !== PROOF_SURFACE_JSON_SCHEMA_VERSION) {
    throw new Error(`Unsupported proof surface schema version: ${String(document.schemaVersion)}`);
  }
  return createProofSurfaceDocument(document.surface, document.generatedAt);
}

export function snapshotProofSurface(surface: ProofSurface, generatedAt = new Date().toISOString()): ProofSurfaceSnapshot {
  const document = createProofSurfaceDocument(surface, generatedAt);
  return {
    document,
    validation: validateProofSurface(document.surface),
  };
}

export function createProofSurfaceCatalogDocument(
  surfaces: ProofSurface[],
  generatedAt = new Date().toISOString(),
): ProofSurfaceCatalogDocument {
  return {
    schemaVersion: PROOF_SURFACE_JSON_SCHEMA_VERSION,
    generatedAt,
    surfaces: surfaces.map((surface) => createProofSurfaceDocument(surface, generatedAt)),
  };
}

export function serializeProofSurfaceCatalog(surfaces: ProofSurface[], generatedAt = new Date().toISOString()): string {
  return JSON.stringify(createProofSurfaceCatalogDocument(surfaces, generatedAt), null, 2);
}

