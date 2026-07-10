import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DriftMetrics, type ProofSurface } from '@aaes-os/aaes-governance';
import {
  createDemoProofSurfaceRegistry,
  createConstitutionalEvidenceGraphFromProofSurfaces,
  createProofSurfaceCatalogDocument,
  listProofSurfaceSummaries,
  resolveConstitutionalEvidenceGraphFromReleaseReceipt,
  summarizeConstitutionalEvidenceGraph,
  type ConstitutionalEvidenceGraph,
  type ConstitutionalReleaseReceipt,
} from '@aaes-os/aaes-governance';
import { createCenDemoResult, type EnforcementReceipt } from '@aaes-os/constitutional-enforcement-node';
import {
  evaluateInvariantFitness,
  proposeInvariant,
} from '@aaes-os/constitutional-evolution';
import {
  collapseGovernanceLayers,
  createLawOfLawsLedger,
  recordMetaConstitutionalCollapsePod,
} from '@aaes-os/meta-constitutional-calculus';
import { forecastTrajectory } from '@aaes-os/nimf';
import {
  appendSovereigntyEntry,
  createSovereigntyLedger,
} from '@aaes-os/sovereignty-ledger';
import {
  createSovereignXScaffold,
  type SovereignXExecutionProofSurface,
} from '@aaes-os/sovereignx-router';

import { createArenaModeSnapshot } from './arenaMode.js';
import {
  approvePatch,
  deployPatch,
  listPatches,
  rejectPatch,
} from './patchLedgerState.js';
import { getSeededMriAssessment, getSeededMriAssessmentV2 } from './mriState.js';
import {
  ensureTelemetrySeeded,
  faultJournal,
  patchAnalytics,
  patternLedger,
} from './telemetryState.js';
import { getSubsystemCoverage } from './coverageState.js';
import { getCabTelemetrySummary } from './cabTelemetry.js';
import { getAaisTelemetryStatus } from './aaisBridge.js';
import { GovernanceAdapter } from './GovernanceAdapter.js';
import { LedgerAdapter } from './LedgerAdapter.js';
import { FaultAdapter } from './FaultAdapter.js';
import { RuntimeAdapter } from './RuntimeAdapter.js';
import { SubstrateAdapter } from './SubstrateAdapter.js';

const PORT = Number(process.env.PORT ?? 4000);
const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(serviceDir, '..', 'dist', 'client');
const releaseReceiptPath = path.resolve(serviceDir, '..', '..', '..', 'release', 'constitutional-release-receipt.json');

ensureTelemetrySeeded();

const seededCenResult = createCenDemoResult();
const sovereigntyLedger = createSovereigntyLedger();
appendSovereigntyEntry(sovereigntyLedger, {
  eventType: 'denied_transition',
  subjectId: seededCenResult.receipt.transitionId,
  payload: seededCenResult.receipt,
  issuedAt: seededCenResult.receipt.issuedAt,
});
const lawOfLawsLedger = createLawOfLawsLedger();
lawOfLawsLedger.append({
  entryType: 'collapse_record',
  subjectId: 'CML-15',
  payload: collapseGovernanceLayers(),
  issuedAt: '2026-06-18T22:02:00.000Z',
});
lawOfLawsLedger.append({
  entryType: 'pod',
  subjectId: 'meta_constitutional_collapse',
  payload: recordMetaConstitutionalCollapsePod(),
  issuedAt: '2026-06-18T22:02:01.000Z',
});
const cenReceipts = new Map<string, EnforcementReceipt>([
  [seededCenResult.receipt.receiptId, seededCenResult.receipt],
]);

const governanceAdapter = new GovernanceAdapter(faultJournal.getAll());
const ledgerAdapter = new LedgerAdapter(listPatches);
const faultAdapter = new FaultAdapter(faultJournal);
const runtimeAdapter = new RuntimeAdapter(() => false);
const substrateAdapter = new SubstrateAdapter(() => false);

const app = express();
const sovereignxRouterProofSurface: ProofSurface = {
  identity: {
    id: '@aaes-os/sovereignx-router',
    name: 'SovereignX Router',
    type: 'implementation',
    version: '0.1.0',
  },
  purpose: 'Route governed compute work across CPU and GPU under CIEMS constraints.',
  claims: [
    {
      id: 'ops-router-cpu-governs-gpu',
      type: 'Architectural',
      statement: 'CPU governs scheduling, continuity, and policy while GPU receives only allowed workloads.',
      evidenceIds: ['ops-router-evidence-tests', 'ops-router-evidence-surface'],
      proofLevel: 'P2',
      verificationStatus: 'Implemented',
      replayStatus: 'Replayable',
      operationalStatus: 'Verified Prototype',
    },
    {
      id: 'ops-router-ciems-policy',
      type: 'Specification',
      statement: 'CIEMS decisions can throttle, quarantine, kill, or allow governed compute tasks.',
      evidenceIds: ['ops-router-evidence-tests'],
      proofLevel: 'P2',
      verificationStatus: 'Implemented',
      replayStatus: 'Replayable',
      operationalStatus: 'Verified Prototype',
    },
  ],
  evidence: [
    {
      id: 'ops-router-evidence-tests',
      statement: 'Router tests exercise CPU/GPU fallback, throttling, quarantine, and proof-surface validation.',
      proofLevel: 'P2',
      verificationStatus: 'Test Verified',
      replayable: true,
      verifiedBy: 'services/ops-console/src/server.test.ts',
    },
    {
      id: 'ops-router-evidence-surface',
      statement: 'Proof surface records are machine-readable and published through the operator catalog.',
      proofLevel: 'P2',
      verificationStatus: 'Implemented',
      replayable: true,
      verifiedBy: 'services/ops-console/src/server.ts',
    },
  ],
  verificationStatus: 'Implemented',
  proofLevel: 'P2',
  replayStatus: 'Replayable',
  operationalStatus: 'Verified Prototype',
  truthBoundary: 'Proves governed routing and policy evaluation, not production-scale cluster orchestration.',
  constitutionalProfile: {
    purpose: 'Govern CPU vs GPU dispatch under constitutional constraints.',
    authority: 'AAES governance law, proof-surface law, and CIEMS policy contracts.',
    evidenceModel: 'Routing decisions, CIEMS decisions, evidence records, and tests.',
    verificationProcess: 'Build, test, replay the router decisions, and validate the proof surface.',
    complianceRequirements: ['No claim may exceed evidence', 'CPU governs policy', 'GPU remains an accelerator'],
    truthBoundary: 'This package proves governed routing, not full cluster management.',
    constitutionalScope: 'Compute routing, governance enforcement, and measurement health.',
    constitutionalLimits: 'It does not claim full hardware management or multi-node scheduling.',
    dependencies: ['local proof surface law'],
    stewardship: 'AAES-OS governance maintainers',
    replayPath: 'Replay the evidence log and routing decisions from the router history.',
    failurePath: 'Throttle, quarantine, delay, or drop work when invariants fail.',
    currentMaturity: 'Verified Prototype',
  },
  blindspots: ['No multi-node orchestration yet', 'No real GPU telemetry adapter yet', 'No thermal sensor integration yet'],
  battleScars: ['Router ideas can overclaim before telemetry exists', 'Policy and acceleration layers can be confused without a proof surface'],
  adversarialClaims: [
    'An attacker could claim GPU work was routed safely without evidence',
    'A stale measurement feed could be mistaken for trustworthy telemetry',
  ],
  colorTeamReadiness: {
    redTeam: 'Attack surface is bounded by explicit routing decisions and evidence records.',
    blueTeam: 'Policy decisions are logged, but real hardware telemetry is still stubbed.',
    purpleTeam: 'Combined attack/defense tests are possible through deterministic router evaluation.',
    greenTeam: 'Build and test are expected to be stable within the workspace package.',
    yellowTeam: 'Operator messaging is clear, but the package is still a prototype.',
    whiteTeam: 'Constitutional authority is explicit and machine-readable.',
  },
  commercialReadiness: {
    targetTier: 'Builder',
    intendedCustomer: 'Developers and platform operators building governed compute runtimes.',
    primaryUseCase: 'Resource fairness and constitutional routing for agentic workloads.',
    valueProposition: 'Makes CPU policy and GPU acceleration auditable and governable.',
    currentReadiness: 'Prototype',
  },
  nextRequiredEvidence: ['Hardware telemetry adapter', 'Multi-node cluster routing', 'Soak and chaos tests'],
};
const proofSurfaceRegistry = createDemoProofSurfaceRegistry();
proofSurfaceRegistry.publish(sovereignxRouterProofSurface);

const sovereignxExecutionScaffold = createSovereignXScaffold({
  applicationName: 'ops-console-sovereignx',
});
sovereignxExecutionScaffold.initialize();
sovereignxExecutionScaffold.waitIdle();
sovereignxExecutionScaffold.shutdown();

const sovereignxExecutionProofSurfaces = sovereignxExecutionScaffold
  .listProofSurfaces()
  .filter((surface): surface is SovereignXExecutionProofSurface => surface.kind === 'execution');

for (const executionSurface of sovereignxExecutionProofSurfaces) {
  proofSurfaceRegistry.publish(mapSovereignXExecutionSurface(executionSurface));
}

function loadConstitutionalReleaseReceipt(): ConstitutionalReleaseReceipt | null {
  if (!existsSync(releaseReceiptPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(releaseReceiptPath, 'utf8')) as ConstitutionalReleaseReceipt;
  } catch {
    return null;
  }
}

function mapSovereignXExecutionSurface(surface: SovereignXExecutionProofSurface): ProofSurface {
  const evidenceById = new Map(
    surface.evidenceIds.map((evidenceId, index) => [
      evidenceId,
      {
        id: evidenceId,
        statement: index === 0
          ? `Execution receipt ${evidenceId} proves ${surface.executionContract.operation}.`
          : `Routed evidence ${evidenceId} supports ${surface.executionContract.operation}.`,
        proofLevel: surface.proofLevel,
        verificationStatus: surface.verificationStatus,
        replayable: true,
        verifiedBy: 'packages/sovereignx-router/src/scaffold.ts',
      },
    ] as const),
  );

  return {
    identity: {
      id: `@aaes-os/${surface.id}`,
      name: `SovereignX Execution: ${surface.executionContract.operation}`,
      type: 'runtime',
      version: surface.sourceId,
    },
    purpose: `Expose governed SovereignX execution evidence for ${surface.executionContract.operation}.`,
    claims: [
      {
        id: `${surface.id}-claim`,
        type: 'Verification',
        statement: surface.executionContract.evidence.summary,
        evidenceIds: [...evidenceById.keys()],
        proofLevel: surface.proofLevel,
        verificationStatus: surface.verificationStatus,
        replayStatus: surface.replayStatus,
        operationalStatus: surface.operationalStatus,
      },
    ],
    evidence: [...evidenceById.values()],
    verificationStatus: surface.verificationStatus,
    proofLevel: surface.proofLevel,
    replayStatus: surface.replayStatus,
    operationalStatus: surface.operationalStatus,
    truthBoundary: surface.executionContract.truthBoundary,
    constitutionalProfile: {
      purpose: `Governed execution evidence for ${surface.executionContract.operation}.`,
      authority: surface.executionContract.authority,
      evidenceModel: surface.executionContract.evidence.artifacts.join(', '),
      verificationProcess: surface.executionContract.verification.method,
      complianceRequirements: surface.executionContract.compliance.requirements,
      truthBoundary: surface.executionContract.truthBoundary,
      constitutionalScope: 'SovereignX execution receipts, replayable evidence, and operator-visible proof surfaces.',
      constitutionalLimits: 'Does not claim full cluster orchestration or external GPU hardware validation.',
      dependencies: ['@aaes-os/sovereignx-router'],
      stewardship: 'SovereignX maintainers and ops-console operators',
      replayPath: surface.executionContract.verification.method,
      failurePath: 'Reject execution surfaces without receipts, route evidence, or compliance.',
      currentMaturity: surface.operationalStatus,
    },
    blindspots: [
      'Execution surfaces are demo-generated from the local SovereignX scaffold.',
      'No external GPU hardware telemetry is captured here yet.',
    ],
    battleScars: [
      'Execution evidence used to live only inside generic receipts.',
      'Operator views needed a first-class execution catalog entry.',
    ],
    adversarialClaims: [
      'A receipt can be mistaken for proof without the execution proof surface.',
      'A routed execution can be mistaken for full GPU orchestration.',
    ],
    colorTeamReadiness: {
      redTeam: 'Execution evidence is visible and should be scrutinized for bypass paths.',
      blueTeam: 'Receipts and route evidence remain machine-readable.',
      purpleTeam: 'Execution claims and governance claims can be reconciled in the same catalog.',
      greenTeam: 'Demo generation is deterministic within the local scaffold.',
      yellowTeam: 'Truth boundaries are explicit for operator review.',
      whiteTeam: 'Authority remains separated from presentation.',
    },
    commercialReadiness: {
      targetTier: 'Builder',
      intendedCustomer: 'Operators and governance teams',
      primaryUseCase: 'Execution-proof visibility alongside governance proof surfaces',
      valueProposition: 'A single catalog for receipt-backed execution and governance evidence.',
      currentReadiness: 'Prototype',
    },
    nextRequiredEvidence: [
      'Live GPU-backed execution path',
      'External replay consumer',
      'Operator drill against catalog-published execution receipts',
    ],
  };
}

function buildEvidenceGraph(): ConstitutionalEvidenceGraph {
  const receipt = loadConstitutionalReleaseReceipt();
  const surfaces = proofSurfaceRegistry.list();

  if (receipt) {
    return resolveConstitutionalEvidenceGraphFromReleaseReceipt(receipt, surfaces, {
      source: 'release-receipt',
    });
  }

  return createConstitutionalEvidenceGraphFromProofSurfaces(surfaces, {
    source: 'local-registry',
  });
}

const evidenceGraph = buildEvidenceGraph();
app.use((req, res, next) => {
  const requestId = req.header('x-request-id') ?? `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'no-referrer');
  next();
});
app.use(express.json({ limit: '1mb' }));

app.use('/proof-surfaces', (req, res, next) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, accept');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/readiness', (_req, res) => {
  const checks = {
    telemetry: faultJournal.getAll().length > 0,
    cen: cenReceipts.size > 0,
    sovereigntyLedger: sovereigntyLedger.entries().length > 0,
    lawOfLawsLedger: lawOfLawsLedger.entries().length > 0,
  };
  res.json({
    ready: Object.values(checks).every(Boolean),
    checks,
  });
});

app.get('/telemetry', async (_req, res) => {
  const faults = faultJournal.getAll();
  const patterns = patternLedger.getAll();
  const drift = new DriftMetrics().computeDrift(faults, patterns);
  const aais = await getAaisTelemetryStatus();
  res.json({
    drift,
    topPatterns: patternLedger.getTopRecurring(5),
    lastFaults: faults.slice(-10).reverse(),
    patchTimeline: patchAnalytics.getTimeline(),
    cab: getCabTelemetrySummary(),
    aais,
    evidenceGraph: summarizeConstitutionalEvidenceGraph(evidenceGraph),
    proofSurfaces: listProofSurfaceSummaries(proofSurfaceRegistry),
  });
});

app.get('/proof-surfaces', (_req, res) => {
  const records = proofSurfaceRegistry.list();
  res.json({
    catalog: createProofSurfaceCatalogDocument(records),
    records,
    summaries: listProofSurfaceSummaries(proofSurfaceRegistry),
  });
});

app.get('/constitutional-release-receipt', (_req, res) => {
  const receipt = evidenceGraph.rootReceipt;
  res.json({ receipt });
});

app.get('/evidence-graph', (_req, res) => {
  res.json({ graph: evidenceGraph, summary: summarizeConstitutionalEvidenceGraph(evidenceGraph) });
});

app.get('/governance', (_req, res) => {
  res.json(governanceAdapter.snapshot());
});

app.get('/ledger', (_req, res) => {
  res.json(ledgerAdapter.snapshot());
});

app.get('/faults', (_req, res) => {
  res.json(faultAdapter.snapshot());
});

app.get('/runtime', (_req, res) => {
  res.json(runtimeAdapter.snapshot());
});

app.get('/substrate', (_req, res) => {
  res.json(substrateAdapter.snapshot());
});

app.get('/aais/health', async (_req, res) => {
  res.json({ aais: await getAaisTelemetryStatus() });
});

app.get('/mri', (_req, res) => {
  res.json(getSeededMriAssessment());
});

app.get('/mri/v2', (_req, res) => {
  res.json(getSeededMriAssessmentV2());
});

app.get('/coverage', (_req, res) => {
  const coverage = getSubsystemCoverage();
  res.json({
    inventory: coverage.inventory,
    mappedDocuments: coverage.documents.length,
    subsystems: Array.from(new Set(coverage.documents.map((doc) => doc.subsystem))).sort(),
    documents: coverage.documents,
  });
});

app.get('/cen/demo', (_req, res) => {
  res.json(seededCenResult);
});

app.get('/cen/events', (_req, res) => {
  res.json({
    status: 'ACTIVE',
    invariantSet: { active: 6, disabled: 0 },
    tokenCounts: { VT: 1, FT: 1, MRT: 1, RT: 1 },
    enforcementRatePerMinute: 14.2,
    replayAttemptsBlocked: 1,
    events: Array.from(cenReceipts.values()),
  });
});

app.get('/cen/receipts/:receiptId', (req, res) => {
  const receipt = cenReceipts.get(req.params.receiptId);
  if (!receipt) {
    res.status(404).json({ error: 'receipt not found' });
    return;
  }
  res.json({ receipt });
});

app.get('/sovereignty-ledger', (_req, res) => {
  res.json({ entries: sovereigntyLedger.entries() });
});

app.get('/nimf/forecast', (_req, res) => {
  res.json({ forecast: forecastTrajectory(getSeededMriAssessmentV2(), 3) });
});

app.post('/evolution/propose', (req, res) => {
  const body = req.body as { invariantId?: string; expression?: string };
  res.json({
    proposal: proposeInvariant({
      invariantId: body.invariantId ?? 'INV-OPS',
      expression: body.expression ?? 'require governance >= 70',
      mode: 'Genesis',
    }),
  });
});

app.post('/evolution/evaluate', (req, res) => {
  const body = req.body as { invariantId?: string; expression?: string };
  const proposal = proposeInvariant({
    invariantId: body.invariantId ?? 'INV-OPS',
    expression: body.expression ?? 'require governance >= 70',
    mode: 'Genesis',
  });
  res.json({ decision: evaluateInvariantFitness({ proposal, mri: getSeededMriAssessmentV2() }) });
});

app.get('/pod/meta_constitutional_collapse', (_req, res) => {
  res.json({
    pod: recordMetaConstitutionalCollapsePod(),
    collapse: collapseGovernanceLayers(),
  });
});

app.get('/meta/law-of-laws', (_req, res) => {
  res.json({ entries: lawOfLawsLedger.entries() });
});

app.get('/patches', (_req, res) => {
  res.json({ patches: listPatches() });
});

app.get('/arena', (_req, res) => {
  res.json(createArenaModeSnapshot());
});

app.post('/patches/:patchId/approve', (req, res) => {
  try {
    const actor = (req.body as { actor?: string })?.actor ?? 'operator';
    const record = approvePatch(req.params.patchId, actor);
    res.json({ patch: record });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/patches/:patchId/reject', (req, res) => {
  try {
    const record = rejectPatch(req.params.patchId);
    res.json({ patch: record });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/patches/:patchId/deploy', (req, res) => {
  try {
    const record = deployPatch(req.params.patchId);
    res.json({ patch: record });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

if (existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`AAES-OS ops-console listening on http://localhost:${PORT}`);
    console.log(`  GET /telemetry`);
  });
}

export { app };
