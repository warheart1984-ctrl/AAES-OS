import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OpsConsoleShell } from './App.js';
import { createArenaModeSnapshot } from './arenaMode.js';
import type { ProofSurfaceSummary } from '@aaes-os/aaes-governance';

function buildProofSurfaceSummary(overrides: Partial<ProofSurfaceSummary> = {}): ProofSurfaceSummary {
  return {
    identity: {
      id: '@aaes-os/aaes-governance',
      name: 'AAES Governance Package',
      type: 'repository',
    },
    domain: 'Governance',
    healthIndicator: 'Verified',
    proofLevel: 'P2',
    maturity: 'Verified Prototype',
    verificationStatus: 'Test Verified',
    replayStatus: 'Replayable',
    operationalStatus: 'Verified Prototype',
    truthBoundary: 'The package does not certify external production systems.',
    constitutionalLimits: 'Does not replace consumer-specific adapters or deployment pipelines.',
    dependencies: ['runledger'],
    inputs: ['gov-impl-evidence'],
    outputs: ['The package implements proof-surface types, validation, and registry helpers.', 'gov-impl'],
    evidenceReceipts: ['gov-impl-evidence'],
    currentEvidence: [
      {
        id: 'gov-impl-evidence',
        statement: 'Source files define ProofSurface, ProofSurfaceRegistry, and JSON helpers.',
        proofLevel: 'P1',
        verificationStatus: 'Implemented',
        replayable: true,
        verifiedBy: 'src/proofSurface.ts',
      },
    ],
    replayPath: 'Replay from registry documents and validation output.',
    verificationPath: 'Build, test, and schema serialization checks.',
    whatItProves: 'Govern proof-surface claims across the stack.',
    whatItDoesNotProve: 'The package does not certify external production systems.',
    blindspots: ['Independent verification is still limited to the local workspace.'],
    knownLimitations: ['Does not replace consumer-specific adapters or deployment pipelines.'],
    adversarialClaims: ['A scorecard can be mistaken for a verified artifact.'],
    battleScars: ['Readiness language used to outpace machine-readable evidence.'],
    relatedProofSurfaces: ['@aaes-os/sovereignx-router'],
    currentMaturity: 'Verified Prototype',
    commercialReadiness: {
      targetTier: 'Builder',
      intendedCustomer: 'Governance teams and tool builders',
      primaryUseCase: 'Machine-readable proof-surface publication',
      valueProposition: 'A standard claim/evidence contract for dashboards and product tiers.',
      currentReadiness: 'Prototype',
    },
    nextRequiredEvidence: ['Independent consumer integration'],
    ...overrides,
  };
}

describe('OpsConsoleView', () => {
  it('renders the knowledge graph and constitutional profile for proof surfaces', () => {
    const html = renderToString(
      <OpsConsoleShell
        telemetry={{
          drift: { score: 0.2, totalFaults: 2, uniquePatterns: 1, topPatterns: [] },
          topPatterns: [],
          lastFaults: [],
          patchTimeline: [],
          aais: {
            connected: true,
            baseUrl: 'http://127.0.0.1:8000',
            service: 'AAIS',
            activeModelMode: 'mock',
            aiStatus: 'initialized',
            aiBootstrapStatus: 'initialized',
            mockModeActive: true,
            legacyApiLoaded: true,
          },
        }}
        mriV2={{
          state_vector: { continuity: 72, governance: 68, memory: 75, coordination: 63, confidence: 81 },
          delta_state: { continuity: 0.08, governance: -0.04, memory: 0.11, coordination: -0.02, confidence: 0.06 },
          trajectory_vector: { continuity: 0.06, governance: -0.03, memory: 0.08, coordination: -0.01, magnitude: 0.1, confidenceWeightedMagnitude: 0.08, confidence_weighted_magnitude: 0.08 },
          benchmarks: {
            industryAverage: { continuity: 61, governance: 59, memory: 64, coordination: 57, confidence: 70 },
            topQuartile: { continuity: 78, governance: 74, memory: 82, coordination: 71, confidence: 85 },
            previousMeasurement: { continuity: 64, governance: 72, memory: 64, coordination: 65, confidence: 74 },
            summary: '+11 above industry',
            deltas: [],
            bar_markers: {
              continuity: { current: 72, previous: 64, industry: 61, topQuartile: 78 },
              governance: { current: 68, previous: 72, industry: 59, topQuartile: 74 },
              memory: { current: 75, previous: 64, industry: 64, topQuartile: 82 },
              coordination: { current: 63, previous: 65, industry: 57, topQuartile: 71 },
              confidence: { current: 81, previous: 74, industry: 70, topQuartile: 85 },
            },
          },
          trajectory_signatures: ['stable_continuity_declining_governance'],
          trajectory_breakdown: [],
          projection: [],
          risks: [],
          interventions: [],
          evidence: { beforeConfidence: 74, afterConfidence: 81, meanConfidence: 0.8, confidenceTensor: { observationCompleteness: 0.8, dataQuality: 0.8, sourceReliability: 0.8, temporalFreshness: 0.8, crossEvidenceConsistency: 0.8 } },
          before_after: {
            before: { continuity: 64, governance: 72, memory: 64, coordination: 65, confidence: 74 },
            after: { continuity: 72, governance: 68, memory: 75, coordination: 63, confidence: 81 },
          },
        }}
        enforcement={{ events: [{ receiptId: 'cen:1', verdict: 'DENY', reasonCode: 'INVARIANT_VIOLATION' }], status: 'ACTIVE' }}
        meta={{ podId: 'meta_constitutional_collapse', generativeCoreId: 'CML-15', metaInvariantCount: 4 }}
        arenaMode={createArenaModeSnapshot('ops-console-test-seed')}
        proofSurfaceCatalog={{
          status: 'loaded',
          catalogUrl: 'http://127.0.0.1:4000/proof-surfaces',
          proofSurfaces: [
            buildProofSurfaceSummary(),
            buildProofSurfaceSummary({
              identity: {
                id: '@aaes-os/sovereignx-router',
                name: 'SovereignX Execution Surface',
                type: 'runtime',
              },
              domain: 'Execution',
              healthIndicator: 'Experimental',
              proofLevel: 'P2',
              maturity: 'Verified Prototype',
              verificationStatus: 'Test Verified',
              whatItProves: 'Governed execution receipts and replayable operator evidence.',
              whatItDoesNotProve: 'It does not prove production cluster orchestration.',
              relatedProofSurfaces: ['@aaes-os/aaes-governance'],
            }),
          ],
        }}
        catalogUrlInput="http://127.0.0.1:4000/proof-surfaces"
        selectedProofSurfaceId="@aaes-os/sovereignx-router"
        onCatalogUrlInputChange={() => undefined}
        onCatalogSubmit={(event) => event.preventDefault()}
        onResetCatalogUrl={() => undefined}
        onUseQueryCatalogUrl={() => undefined}
        onSelectedProofSurfaceChange={() => undefined}
      />
    );

    expect(html).toContain('Constitutional Knowledge Graph');
    expect(html).toContain('Governance');
    expect(html).toContain('Execution');
    expect(html).toContain('Arena Mode');
    expect(html).toContain('Challenge');
    expect(html).toContain('Tournament');
    expect(html).toContain('Replay Timeline');
    expect(html).toContain('What it proves');
    expect(html).toContain('What it does not prove');
    expect(html).toContain('Related proof surfaces');
    expect(html).toContain('SovereignX Execution Surface');
  });
});
