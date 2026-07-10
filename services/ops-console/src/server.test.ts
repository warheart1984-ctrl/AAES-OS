import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, afterAll, beforeAll } from 'vitest';

import { app } from './server.js';

describe('GET /telemetry', () => {
  let server: Server;
  let baseUrl = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 4000;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it('returns drift, topPatterns, and lastFaults keys', async () => {
    const response = await fetch(`${baseUrl}/telemetry`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      drift: { score: number; totalFaults: number; uniquePatterns: number };
      topPatterns: unknown[];
      lastFaults: unknown[];
      patchTimeline: unknown[];
    };

    expect(body.drift).toEqual(
      expect.objectContaining({
        score: expect.any(Number),
        totalFaults: expect.any(Number),
        uniquePatterns: expect.any(Number),
      }),
    );
    expect(body.drift.totalFaults).toBeGreaterThan(0);
    expect(Array.isArray(body.topPatterns)).toBe(true);
    expect(Array.isArray(body.lastFaults)).toBe(true);
    expect(Array.isArray(body.patchTimeline)).toBe(true);
  });

  it('returns the proof-surface catalog for operators and dashboards', async () => {
    const response = await fetch(`${baseUrl}/proof-surfaces`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = (await response.json()) as {
      catalog: { schemaVersion: string; surfaces: unknown[] };
      records: unknown[];
      summaries: { identity: { id: string }; proofLevel: string; domain: string; healthIndicator: string }[];
    };

    expect(body.catalog.schemaVersion).toBe('1.0');
    expect(body.records.length).toBeGreaterThan(0);
    expect(body.summaries.some((surface) => surface.identity.id === '@aaes-os/aaes-governance' && surface.domain === 'Governance')).toBe(true);
    expect(body.summaries.some((surface) => surface.identity.id === '@aaes-os/sovereignx-router' && surface.domain === 'Execution')).toBe(true);
    expect(body.summaries.every((surface) => typeof surface.healthIndicator === 'string')).toBe(true);
  });

  it('returns the constitutional evidence graph rooted in the release receipt', async () => {
    const response = await fetch(`${baseUrl}/evidence-graph`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      summary: { rootReceiptId: string; proofSurfaceCount: number; claimCount: number; unresolvedClaims: string[] };
      graph: { rootReceipt: { receiptId: string }; claims: unknown[] };
    };

    expect(body.summary.rootReceiptId).toBe(body.graph.rootReceipt.receiptId);
    expect(body.summary.proofSurfaceCount).toBeGreaterThan(0);
    expect(body.summary.claimCount).toBeGreaterThan(0);
    expect(body.summary.unresolvedClaims).toHaveLength(0);
  });

  it('returns the arena mode snapshot for the tournament console', async () => {
    const response = await fetch(`${baseUrl}/arena`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = (await response.json()) as {
      arenaId: string;
      map: { width: number; height: number; terrainGrid: string[][] };
      agents: { name: string; faction: string; talents: { name: string }[] }[];
      challengeRuns: { runId: string; status: string; proofLevel: string; timeline: unknown[] }[];
      scorecard: { proofLevel: string; readinessLevel: string; challengePassRate: number };
      lifecycle: { stage: string; status: string; artifacts: string[] }[];
      certificate: { certificateId: string; readinessLevel: string; challengeResults: string };
      tournament: { tournamentId: string; rounds: { matchId: string; winner: string | null; tracePath: string | null }[][] };
      replayReports: Record<string, { integrityScore: number; tracePath: string }>;
      battleScars: { scarId: string; type: string }[];
      digitalThread: string[];
    };

    expect(body.arenaId).toMatch(/^arena-/);
    expect(body.map.width).toBeGreaterThan(0);
    expect(body.map.height).toBeGreaterThan(0);
    expect(body.map.terrainGrid).toHaveLength(body.map.height);
    expect(body.agents.length).toBeGreaterThan(0);
    expect(body.agents.every((agent) => agent.talents.length > 0)).toBe(true);
    expect(body.challengeRuns.length).toBeGreaterThan(0);
    expect(body.challengeRuns.every((run) => Array.isArray(run.timeline) && run.timeline.length > 0)).toBe(true);
    expect(body.scorecard.proofLevel).toMatch(/^P[0-5]$/);
    expect(body.scorecard.readinessLevel).toMatch(/prototype|candidate|production-ready/);
    expect(body.lifecycle.map((phase) => phase.stage)).toEqual(['Design', 'Build', 'Verify', 'Challenge', 'Certify', 'Release', 'Observe', 'Learn']);
    expect(body.certificate.certificateId).toMatch(/^certificate-/);
    expect(body.certificate.challengeResults).toContain('challenges');
    expect(body.tournament.rounds.length).toBeGreaterThan(0);
    expect(Object.keys(body.replayReports).length).toBeGreaterThan(0);
    expect(Object.values(body.replayReports).every((report) => report.integrityScore >= 0 && report.integrityScore <= 100)).toBe(true);
    expect(body.battleScars.length).toBeGreaterThan(0);
    expect(body.digitalThread.length).toBeGreaterThan(0);
  });

  it('allows the studio to fetch proof surfaces cross-origin', async () => {
    const response = await fetch(`${baseUrl}/proof-surfaces`, {
      method: 'OPTIONS',
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
  });

  it('surfaces CAB ledger summary and invariant status for operators', async () => {
    const previousStore = process.env.CAB_STORE;
    const tempDir = mkdtempSync(path.join(tmpdir(), 'cab-ledger-'));
    const storePath = path.join(tempDir, 'ledger.jsonl');
    const records = [
      {
        sequence: 1,
        object_type: 'IntentRecord',
        object_id: 'cab.intent.ops',
        created_at: '2026-06-19T12:00:00Z',
        superseded: false,
        payload: { intent_id: 'cab.intent.ops', created_at: '2026-06-19T12:00:00Z' },
      },
      {
        sequence: 2,
        object_type: 'DecisionRecord',
        object_id: 'cab.decision.ops',
        created_at: '2026-06-19T12:01:00Z',
        superseded: false,
        payload: {
          decision_id: 'cab.decision.ops',
          intent_refs: ['cab.intent.ops'],
          evidence_chain_refs: ['cab.evidence.ops'],
          continuity_receipt_refs: ['cab.receipt.ops'],
          govern_policy_refs: ['policy:ops'],
          created_at: '2026-06-19T12:01:00Z',
        },
      },
      {
        sequence: 3,
        object_type: 'EvidenceChain',
        object_id: 'cab.evidence.ops',
        created_at: '2026-06-19T12:02:00Z',
        superseded: false,
        payload: { chain_id: 'cab.evidence.ops', created_at: '2026-06-19T12:02:00Z' },
      },
      {
        sequence: 4,
        object_type: 'ContinuityReceipt',
        object_id: 'cab.receipt.ops',
        created_at: '2026-06-19T12:03:00Z',
        superseded: false,
        payload: { receipt_id: 'cab.receipt.ops', trace_id: 'ct.ops', created_at: '2026-06-19T12:03:00Z' },
      },
    ];
    writeFileSync(storePath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');
    process.env.CAB_STORE = storePath;

    try {
      const response = await fetch(`${baseUrl}/telemetry`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        cab: {
          available: boolean;
          entryCount: number;
          activeCount: number;
          invariants: { passed: boolean; results: { invariantId: string; status: string }[] };
          latest: { intents: string[]; decisions: string[]; evidenceChains: string[]; continuityReceipts: string[] };
        };
      };
      expect(body.cab.available).toBe(true);
      expect(body.cab.entryCount).toBe(4);
      expect(body.cab.activeCount).toBe(4);
      expect(body.cab.invariants.passed).toBe(true);
      expect(body.cab.invariants.results.map((result) => result.invariantId)).toEqual(['CL', 'RC', 'TI', 'SU', 'NE']);
      expect(body.cab.latest).toEqual({
        intents: ['cab.intent.ops'],
        decisions: ['cab.decision.ops'],
        evidenceChains: ['cab.evidence.ops'],
        continuityReceipts: ['cab.receipt.ops'],
        reconstructionPlans: [],
      });
    } finally {
      if (previousStore === undefined) {
        delete process.env.CAB_STORE;
      } else {
        process.env.CAB_STORE = previousStore;
      }
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('connects AAIS health into telemetry', async () => {
    const previousBaseUrl = process.env.AAIS_BASE_URL;
    let aaisServer: Server;
    let aaisBaseUrl = '';
    await new Promise<void>((resolve) => {
      aaisServer = createServer((_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({
          status: 'healthy',
          service: 'AAIS',
          legacy_api_loaded: true,
          active_model_mode: 'mock',
          ai_status: 'initialized',
          ai_bootstrap_status: 'initialized',
          mock_mode_active: true,
        }));
      });
      aaisServer.listen(0, '127.0.0.1', () => {
        const address = aaisServer.address();
        const port = typeof address === 'object' && address ? address.port : 8000;
        aaisBaseUrl = `http://127.0.0.1:${port}`;
        process.env.AAIS_BASE_URL = aaisBaseUrl;
        resolve();
      });
    });

    try {
      const response = await fetch(`${baseUrl}/telemetry`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        aais: {
          connected: boolean;
          baseUrl: string;
          service: string;
          activeModelMode: string;
          aiStatus: string;
          aiBootstrapStatus: string;
          mockModeActive: boolean;
          legacyApiLoaded: boolean;
        };
      };
      expect(body.aais).toEqual(expect.objectContaining({
        connected: true,
        baseUrl: aaisBaseUrl,
        service: 'AAIS',
        activeModelMode: 'mock',
        aiStatus: 'initialized',
        aiBootstrapStatus: 'initialized',
        mockModeActive: true,
        legacyApiLoaded: true,
      }));
    } finally {
      if (previousBaseUrl === undefined) {
        delete process.env.AAIS_BASE_URL;
      } else {
        process.env.AAIS_BASE_URL = previousBaseUrl;
      }
      await new Promise<void>((resolve, reject) => {
        aaisServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });

  it('exposes production health, readiness, request id, and security headers', async () => {
    const response = await fetch(`${baseUrl}/readiness`);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-request-id')).toBeTruthy();

    const body = (await response.json()) as {
      ready: boolean;
      checks: { telemetry: boolean; cen: boolean; sovereigntyLedger: boolean; lawOfLawsLedger: boolean };
    };
    expect(body.ready).toBe(true);
    expect(body.checks).toEqual({
      telemetry: true,
      cen: true,
      sovereigntyLedger: true,
      lawOfLawsLedger: true,
    });
  });

  it('returns the seeded MRI operator assessment', async () => {
    const response = await fetch(`${baseUrl}/mri`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      comparison: {
        before: { scores: { continuity: number; confidence: number } };
        after: { scores: { continuity: number; confidence: number } };
        deltaState: Record<string, number>;
      };
      report: { summary: string };
    };

    expect(body.comparison.before.scores.continuity).toBeTypeOf('number');
    expect(body.comparison.after.scores.continuity).toBeGreaterThan(
      body.comparison.before.scores.continuity,
    );
    expect(body.comparison.after.scores.confidence).toBeGreaterThanOrEqual(
      body.comparison.before.scores.confidence,
    );
    expect(body.comparison.deltaState).toEqual(
      expect.objectContaining({
        R: expect.any(Number),
        K: expect.any(Number),
        G: expect.any(Number),
        D: expect.any(Number),
        X: expect.any(Number),
      }),
    );
    expect(body.report.summary).toContain('Continuity increased by');
  });

  it('returns recent document subsystem coverage for operators', async () => {
    const response = await fetch(`${baseUrl}/coverage`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      mappedDocuments: number;
      subsystems: string[];
      documents: { path: string; subsystem: string }[];
    };

    expect(body.mappedDocuments).toBe(38);
    expect(body.subsystems).toContain('trust-root');
    expect(body.subsystems).toContain('ucr-attestation');
    expect(body.subsystems).toContain('runtime-law-spine');
    expect(body.subsystems).toContain('evidence-receipts');
    expect(body.documents.some((doc) => doc.path === 'docs/contracts/AAES_OS_ARCHITECTURE_V1.md')).toBe(true);
  });

  it('returns the CEN enforcement demo receipt', async () => {
    const response = await fetch(`${baseUrl}/cen/demo`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      decision: { verdict: string; reasonCode: string };
      receipt: { receiptId: string; evaluations: unknown[]; mriSnapshotHash: string };
    };

    expect(body.decision.verdict).toBe('DENY');
    expect(body.decision.reasonCode).toBe('INVARIANT_VIOLATION');
    expect(body.receipt.receiptId).toMatch(/^cen:/);
    expect(body.receipt.mriSnapshotHash).toMatch(/^sha3-256:/);
    expect(body.receipt.evaluations.length).toBeGreaterThan(0);
  });

  it('returns the meta-constitutional collapse POD for operators', async () => {
    const response = await fetch(`${baseUrl}/pod/meta_constitutional_collapse`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      pod: { podId: string; rewardMultiplier: number; status: string };
      collapse: { generativeCoreId: string; metaInvariants: unknown[] };
    };

    expect(body.pod.podId).toBe('meta_constitutional_collapse');
    expect(body.pod.rewardMultiplier).toBe(500);
    expect(body.pod.status).toBe('recorded');
    expect(body.collapse.generativeCoreId).toBe('CML-15');
    expect(body.collapse.metaInvariants).toHaveLength(4);
  });

  it('returns CEN events, receipts, sovereignty ledger, NIMF forecast, and law-of-laws entries', async () => {
    const events = await fetch(`${baseUrl}/cen/events`);
    const eventsBody = (await events.json()) as { events: { receiptId: string }[] };
    const [receipt, missingReceipt, sovereignty, forecast, law] = await Promise.all([
      fetch(`${baseUrl}/cen/receipts/${encodeURIComponent(eventsBody.events[0]?.receiptId ?? '')}`),
      fetch(`${baseUrl}/cen/receipts/not-found`),
      fetch(`${baseUrl}/sovereignty-ledger`),
      fetch(`${baseUrl}/nimf/forecast`),
      fetch(`${baseUrl}/meta/law-of-laws`),
    ]);

    expect(events.status).toBe(200);
    expect(receipt.status).toBe(200);
    expect(missingReceipt.status).toBe(404);
    expect(sovereignty.status).toBe(200);
    expect(forecast.status).toBe(200);
    expect(law.status).toBe(200);

    expect(eventsBody.events.length).toBeGreaterThan(0);
    expect((await receipt.json()) as { receipt: { receiptId: string } }).toEqual(
      expect.objectContaining({ receipt: expect.objectContaining({ receiptId: expect.stringMatching(/^cen:/) }) }),
    );
    expect(((await sovereignty.json()) as { entries: unknown[] }).entries.length).toBeGreaterThan(0);
    expect(((await forecast.json()) as { forecast: { horizon: number } }).forecast.horizon).toBe(3);
    expect(((await law.json()) as { entries: unknown[] }).entries.length).toBeGreaterThan(0);
  });

  it('returns patch approval records as JSON for the operator console', async () => {
    const response = await fetch(`${baseUrl}/patches`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = (await response.json()) as {
      patches: { patchId: string; status: string; proposedBy: string }[];
    };
    expect(body.patches.length).toBeGreaterThan(0);
    expect(body.patches[0]).toEqual(expect.objectContaining({
      patchId: expect.any(String),
      status: expect.any(String),
      proposedBy: expect.any(String),
    }));
  });

  it('accepts evolution proposal and evaluation requests', async () => {
    const proposed = await fetch(`${baseUrl}/evolution/propose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ invariantId: 'INV-OPS', expression: 'require governance >= 70' }),
    });
    const evaluated = await fetch(`${baseUrl}/evolution/evaluate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ invariantId: 'INV-OPS', expression: 'require governance >= 70' }),
    });

    expect(proposed.status).toBe(200);
    expect(evaluated.status).toBe(200);
    expect(((await proposed.json()) as { proposal: { status: string } }).proposal.status).toBe('proposed');
    expect(((await evaluated.json()) as { decision: { decision: string } }).decision.decision).toMatch(/promote|retain|revert/);
  });
});
