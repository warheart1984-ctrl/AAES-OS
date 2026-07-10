import React, { useEffect, useState, type FormEvent } from 'react';

import type { ConstitutionalEvidenceGraphSummary, ProofSurfaceSummary } from '@aaes-os/aaes-governance';
import { ArenaModePanel } from './ArenaModePanel.js';
import { createArenaModeSnapshot, type ArenaSnapshot } from './arenaMode.js';
import { PatchApprovals } from './PatchApprovals.js';
import {
  DEFAULT_PROOF_SURFACE_CATALOG_URL,
  PROOF_SURFACE_CATALOG_STORAGE_KEY,
  resolveInitialProofSurfaceCatalogUrl,
  normalizeProofSurfaceCatalogUrl,
} from './catalogConfig.js';

type DriftScore = {
  score: number;
  totalFaults: number;
  uniquePatterns: number;
  topPatterns?: PatternRecord[];
};

type PatternRecord = {
  patternId: string;
  faultCodes: string[];
  invariantIds?: string[];
  recurrence: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

type FaultEvent = {
  faultId: string;
  runId: string;
  spanId: string;
  invariantId?: string;
  timestamp: string;
  faultCode: string;
  severity: string;
};

type PatchPoint = {
  patchId: string;
  timestamp: string;
  effectiveness: number;
};

type TelemetryResponse = {
  drift: DriftScore;
  topPatterns: PatternRecord[];
  lastFaults: FaultEvent[];
  patchTimeline?: PatchPoint[];
  proofSurfaces?: ProofSurfaceSummary[];
  aais?: {
    connected: boolean;
    baseUrl: string;
    status: string;
    service: string;
    activeModelMode: string;
    aiStatus: string;
    aiBootstrapStatus: string;
    mockModeActive: boolean;
    legacyApiLoaded: boolean;
    contractors: unknown[];
    error?: string;
  };
  cab?: {
    available: boolean;
    entryCount: number;
    activeCount: number;
    invariants: { passed: boolean; results: { invariantId: string; status: string; detail: string }[] };
    latest: {
      intents: string[];
      decisions: string[];
      evidenceChains: string[];
      continuityReceipts: string[];
      reconstructionPlans: string[];
    };
  };
  evidenceGraph?: ConstitutionalEvidenceGraphSummary;
};

type ScoreVector = {
  continuity: number;
  governance: number;
  memory: number;
  coordination: number;
  confidence: number;
};

type MriV2Response = {
  state_vector: ScoreVector;
  delta_state: ScoreVector;
  trajectory_vector: {
    continuity: number;
    governance: number;
    memory: number;
    coordination: number;
    magnitude: number;
    confidenceWeightedMagnitude: number;
    confidence_weighted_magnitude: number;
  };
  benchmarks: {
    industryAverage: ScoreVector;
    topQuartile: ScoreVector;
    previousMeasurement: ScoreVector;
    summary: string;
    deltas: { dimension: keyof ScoreVector; vsPrevious: number; vsIndustry: number; vsTopQuartile: number }[];
    bar_markers: Record<keyof ScoreVector, { current: number; previous: number; industry: number; topQuartile: number }>;
  };
  trajectory_signatures: string[];
  trajectory_breakdown: { dimension: keyof ScoreVector; delta: number; confidence: number; contribution: number; direction: string }[];
  projection: ScoreVector[];
  risks: { id: string; type: string; description: string }[];
  interventions: { id: string; type: string; description: string; score: number }[];
  evidence: { beforeConfidence: number; afterConfidence: number; meanConfidence: number; confidenceTensor: Record<string, number> };
  before_after: { before: ScoreVector; after: ScoreVector };
};

type EnforcementSummary = {
  status: string;
  events: { receiptId: string; verdict: string; reasonCode: string; transitionId?: string }[];
  invariantSet?: { active: number; disabled: number };
  tokenCounts?: Record<string, number>;
  enforcementRatePerMinute?: number;
  replayAttemptsBlocked?: number;
};

type MetaSummary = {
  podId: string;
  generativeCoreId: string;
  metaInvariantCount: number;
};

type LoadedState = {
  telemetry: TelemetryResponse;
  mriV2: MriV2Response;
  enforcement: EnforcementSummary;
  meta: MetaSummary;
};

type ProofSurfaceCatalogState = {
  status: 'loading' | 'loaded' | 'error';
  catalogUrl: string;
  error?: string;
  proofSurfaces: ProofSurfaceSummary[];
};

export const App: React.FC = () => {
  const [state, setState] = useState<LoadedState | null>(null);
  const [proofSurfaceCatalog, setProofSurfaceCatalog] = useState<ProofSurfaceCatalogState>(() => {
    const initialCatalogUrl = resolveInitialProofSurfaceCatalogUrl(
      typeof window === 'undefined' ? '' : window.location.search,
      typeof window === 'undefined' ? null : window.localStorage.getItem(PROOF_SURFACE_CATALOG_STORAGE_KEY),
    );
    return {
      status: 'loading',
      catalogUrl: initialCatalogUrl,
      proofSurfaces: [],
    };
  });
  const [catalogUrlInput, setCatalogUrlInput] = useState(proofSurfaceCatalog.catalogUrl);
  const [selectedProofSurfaceId, setSelectedProofSurfaceId] = useState<string | null>(null);
  const [arenaMode, setArenaMode] = useState<ArenaSnapshot>(() => createArenaModeSnapshot());

  useEffect(() => {
    const fetchTelemetry = async () => {
      const [telemetryRes, mriRes, enforcementRes, metaRes] = await Promise.all([
        fetch('/telemetry'),
        fetch('/mri/v2'),
        fetch('/cen/events'),
        fetch('/pod/meta_constitutional_collapse'),
      ]);
      const telemetry = (await telemetryRes.json()) as TelemetryResponse;
      const mriV2 = (await mriRes.json()) as MriV2Response;
      const enforcement = (await enforcementRes.json()) as EnforcementSummary;
      const metaPayload = (await metaRes.json()) as {
        pod: { podId: string };
        collapse: { generativeCoreId: string; metaInvariants: unknown[] };
      };
      setState({
        telemetry,
        mriV2,
        enforcement,
        meta: {
          podId: metaPayload.pod.podId,
          generativeCoreId: metaPayload.collapse.generativeCoreId,
          metaInvariantCount: metaPayload.collapse.metaInvariants.length,
        },
      });
    };
    fetchTelemetry();
    const id = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchArena = async () => {
      try {
        const response = await fetch('/arena');
        if (!response.ok) {
          return;
        }
        const arena = (await response.json()) as ArenaSnapshot;
        if (!cancelled) {
          setArenaMode(arena);
        }
      } catch {
        // Fall back to the seeded local arena snapshot.
      }
    };

    void fetchArena();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      setProofSurfaceCatalog((current) => ({
        ...current,
        status: 'loading',
        error: undefined,
      }));

      try {
        const proofRes = await fetch(proofSurfaceCatalog.catalogUrl, {
          headers: {
            accept: 'application/json',
          },
        });

        if (!proofRes.ok) {
          throw new Error(`catalog request failed with ${proofRes.status}`);
        }

        const proofPayload = (await proofRes.json()) as {
          summaries?: ProofSurfaceSummary[];
          catalog?: { surfaces?: Array<{ surface?: unknown }> };
        };
        const summaries = Array.isArray(proofPayload.summaries)
          ? proofPayload.summaries
          : Array.isArray(proofPayload.catalog?.surfaces)
            ? proofPayload.catalog.surfaces
                .map((entry) => entry.surface)
                .filter(isProofSurfaceSummary)
            : [];

        if (!cancelled) {
          setProofSurfaceCatalog({
            status: 'loaded',
            catalogUrl: proofSurfaceCatalog.catalogUrl,
            proofSurfaces: summaries,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setProofSurfaceCatalog({
            status: 'error',
            catalogUrl: proofSurfaceCatalog.catalogUrl,
            error: error instanceof Error ? error.message : String(error),
            proofSurfaces: [],
          });
        }
      }
    };

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [proofSurfaceCatalog.catalogUrl]);

  useEffect(() => {
    if (proofSurfaceCatalog.status !== 'loaded' || proofSurfaceCatalog.proofSurfaces.length === 0) {
      return;
    }

    const selectedSurfaceStillExists = selectedProofSurfaceId
      ? proofSurfaceCatalog.proofSurfaces.some((surface) => surface.identity.id === selectedProofSurfaceId)
      : false;

    if (!selectedSurfaceStillExists) {
      setSelectedProofSurfaceId(proofSurfaceCatalog.proofSurfaces[0].identity.id);
    }
  }, [proofSurfaceCatalog.proofSurfaces, proofSurfaceCatalog.status, selectedProofSurfaceId]);

  const applyCatalogUrl = (nextCatalogUrl: string) => {
    const normalizedCatalogUrl = normalizeProofSurfaceCatalogUrl(nextCatalogUrl);
    setCatalogUrlInput(normalizedCatalogUrl);
    setProofSurfaceCatalog((current) => ({
      ...current,
      status: 'loading',
      catalogUrl: normalizedCatalogUrl,
      error: undefined,
      proofSurfaces: current.status === 'loaded' ? current.proofSurfaces : [],
    }));

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROOF_SURFACE_CATALOG_STORAGE_KEY, normalizedCatalogUrl);
      const nextLocation = new URL(window.location.href);
      nextLocation.searchParams.set('catalogUrl', normalizedCatalogUrl);
      window.history.replaceState({}, '', `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`);
    }
  };

  const handleCatalogSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyCatalogUrl(catalogUrlInput);
  };

  const resetCatalogUrl = () => {
    applyCatalogUrl(DEFAULT_PROOF_SURFACE_CATALOG_URL);
  };

  const useCatalogFromQuery = () => {
    applyCatalogUrl(resolveInitialProofSurfaceCatalogUrl(window.location.search, null));
  };

  if (!state) return <div>Loading telemetry...</div>;
  return (
    <OpsConsoleShell
      telemetry={state.telemetry}
      mriV2={state.mriV2}
      enforcement={state.enforcement}
      meta={state.meta}
      proofSurfaceCatalog={proofSurfaceCatalog}
      catalogUrlInput={catalogUrlInput}
      selectedProofSurfaceId={selectedProofSurfaceId}
      onCatalogUrlInputChange={setCatalogUrlInput}
      onCatalogSubmit={handleCatalogSubmit}
      onResetCatalogUrl={resetCatalogUrl}
      onUseQueryCatalogUrl={useCatalogFromQuery}
      onSelectedProofSurfaceChange={setSelectedProofSurfaceId}
      arenaMode={arenaMode}
    />
  );
};

type OpsConsoleShellProps = LoadedState & {
  proofSurfaceCatalog: ProofSurfaceCatalogState;
  catalogUrlInput: string;
  selectedProofSurfaceId: string | null;
  onCatalogUrlInputChange: (value: string) => void;
  onCatalogSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetCatalogUrl: () => void;
  onUseQueryCatalogUrl: () => void;
  onSelectedProofSurfaceChange: (value: string) => void;
  arenaMode: ArenaSnapshot;
};

export const OpsConsoleShell: React.FC<OpsConsoleShellProps> = ({
  telemetry,
  mriV2,
  enforcement,
  meta,
  proofSurfaceCatalog,
  catalogUrlInput,
  selectedProofSurfaceId,
  onCatalogUrlInputChange,
  onCatalogSubmit,
  onResetCatalogUrl,
  onUseQueryCatalogUrl,
  onSelectedProofSurfaceChange,
  arenaMode,
}) => (
  <div style={{ fontFamily: 'system-ui', padding: 16, color: '#172026', background: '#f6f7f9' }}>
    <h1 style={{ margin: '0 0 16px' }}>AAES-OS Ops Console</h1>
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      <a href="#catalog">Constitutional Knowledge Graph</a>
      <a href="#mri">MRI Cockpit</a>
      <a href="#enforcement">Enforcement Dashboard</a>
      <a href="#meta">Meta-Constitutional Console</a>
      <a href="#arena">Arena Mode</a>
      <a href="#aais">AAIS Runtime</a>
      <a href="#cab">CAB Continuity</a>
    </nav>

    <section id="catalog" style={sectionStyle}>
      <h2>Constitutional Knowledge Graph</h2>
      <p>Point the Ops Console at any proof-surface backend and explore surfaces by domain, health, and constitutional profile.</p>
      <form onSubmit={onCatalogSubmit} style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Catalog URL</span>
          <input
            value={catalogUrlInput}
            onChange={(event) => onCatalogUrlInputChange(event.target.value)}
            spellCheck={false}
            placeholder={DEFAULT_PROOF_SURFACE_CATALOG_URL}
            style={{
              border: '1px solid #b8c2cf',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 14,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="submit" style={buttonStyle}>Load catalog</button>
          <button type="button" onClick={onUseQueryCatalogUrl} style={secondaryButtonStyle}>Use URL from query</button>
          <button type="button" onClick={onResetCatalogUrl} style={secondaryButtonStyle}>Reset to default</button>
        </div>
      </form>
      <div style={{ color: '#5f6b7a', fontSize: 13, display: 'grid', gap: 4, marginBottom: 12 }}>
        <div>Active catalog: {proofSurfaceCatalog.catalogUrl}</div>
        <div>Status: {proofSurfaceCatalog.status}</div>
        {proofSurfaceCatalog.error ? <div>Error: {proofSurfaceCatalog.error}</div> : null}
      </div>
      <ProofSurfaceKnowledgeGraph
        surfaces={proofSurfaceCatalog.proofSurfaces}
        selectedProofSurfaceId={selectedProofSurfaceId}
        onSelectedProofSurfaceChange={onSelectedProofSurfaceChange}
      />
    </section>

    <section style={sectionStyle}>
      <h2>Constitutional Evidence Graph</h2>
      <p>The evidence graph resolves the release receipt into the proof-surface and public-view nodes used by every operator surface.</p>
      <div style={gridStyle}>
        <Metric label="Graph ID" value={telemetry.evidenceGraph?.graphId ?? 'loading'} />
        <Metric label="Root Receipt" value={telemetry.evidenceGraph?.rootReceiptId ?? 'loading'} />
        <Metric label="Claims" value={String(telemetry.evidenceGraph?.claimCount ?? 0)} />
        <Metric label="Unresolved" value={String(telemetry.evidenceGraph?.unresolvedClaims.length ?? 0)} />
      </div>
      <p style={{ marginBottom: 0, color: '#5f6b7a' }}>
        Public claims resolve through the same evidence graph before they appear in dashboards or docs.
      </p>
    </section>

    <OpsConsoleView
      telemetry={telemetry}
      mriV2={mriV2}
      enforcement={enforcement}
      meta={meta}
      arenaMode={arenaMode}
    />
  </div>
);

export const OpsConsoleView: React.FC<LoadedState & { arenaMode: ArenaSnapshot }> = ({ telemetry, mriV2, enforcement, meta, arenaMode }) => (
  <div>
    <section id="mri" style={sectionStyle}>
      <h2>MRI Cockpit</h2>
      <p>{mriV2.benchmarks.summary}</p>
      <div style={gridStyle}>
        {(['continuity', 'governance', 'memory', 'coordination', 'confidence'] as const).map((dimension) => (
          <BenchmarkCard
            key={dimension}
            label={dimension}
            score={mriV2.state_vector[dimension]}
            delta={mriV2.delta_state[dimension]}
            markers={mriV2.benchmarks.bar_markers[dimension]}
          />
        ))}
      </div>
      <div style={gridStyle}>
        <Panel title="Risk Register">
          <ul>{mriV2.risks.map((risk) => <li key={risk.id}>{risk.type}: {risk.description}</li>)}</ul>
        </Panel>
        <Panel title="Intervention Ranking">
          <ol>{mriV2.interventions.slice(0, 3).map((item) => <li key={item.id}>{item.type} ({item.score})</li>)}</ol>
        </Panel>
        <Panel title="Trajectory">
          <p>Magnitude {mriV2.trajectory_vector.magnitude.toFixed(3)}</p>
          <p>Weighted {mriV2.trajectory_vector.confidence_weighted_magnitude.toFixed(3)}</p>
          <p>{mriV2.trajectory_signatures.join(', ')}</p>
        </Panel>
        <Panel title="Evidence Ledger">
          <p>Mean confidence {mriV2.evidence.meanConfidence.toFixed(3)}</p>
          <p>Before {mriV2.evidence.beforeConfidence} | After {mriV2.evidence.afterConfidence}</p>
        </Panel>
        <Panel title="Evidence Graph">
          <p>Root receipt {telemetry.evidenceGraph?.rootReceiptId ?? 'loading'}</p>
          <p>Verified claims {telemetry.evidenceGraph?.verifiedClaimCount ?? 0}</p>
          <p>Views {telemetry.evidenceGraph?.viewCount ?? 0}</p>
        </Panel>
      </div>
    </section>

    <section id="enforcement" style={sectionStyle}>
      <h2>Enforcement Dashboard</h2>
      <div style={gridStyle}>
        <Metric label="CEN" value={enforcement.status} />
        <Metric label="Invariant Set" value={`${enforcement.invariantSet?.active ?? 0} active`} />
        <Metric label="Rate" value={`${enforcement.enforcementRatePerMinute ?? 0}/min`} />
        <Metric label="Replay Blocks" value={String(enforcement.replayAttemptsBlocked ?? 0)} />
      </div>
      <table>
        <thead><tr><th>Receipt</th><th>Verdict</th><th>Reason</th></tr></thead>
        <tbody>
          {enforcement.events.map((event) => (
            <tr key={event.receiptId}><td>{event.receiptId}</td><td>{event.verdict}</td><td>{event.reasonCode}</td></tr>
          ))}
        </tbody>
      </table>
    </section>

    <section id="meta" style={sectionStyle}>
      <h2>Meta-Constitutional Console</h2>
      <div style={gridStyle}>
        <Metric label="POD" value={meta.podId} />
        <Metric label="Core" value={meta.generativeCoreId} />
        <Metric label="Meta-Invariants" value={String(meta.metaInvariantCount)} />
        <Metric label="Drift" value={telemetry.drift.score.toFixed(3)} />
      </div>
    </section>

    <section id="aais" style={sectionStyle}>
      <h2>AAIS Runtime</h2>
      <div style={gridStyle}>
        <Metric label="Link" value={telemetry.aais?.connected ? 'connected' : 'offline'} />
        <Metric label="Mode" value={telemetry.aais?.activeModelMode || 'unknown'} />
        <Metric label="AI" value={telemetry.aais?.aiStatus || telemetry.aais?.status || 'unknown'} />
        <Metric label="Legacy API" value={telemetry.aais?.legacyApiLoaded ? 'loaded' : 'pending'} />
      </div>
      <div style={gridStyle}>
        <Panel title="Bridge">
          <p>{telemetry.aais?.baseUrl ?? 'AAIS_BASE_URL unset'}</p>
          <p>{telemetry.aais?.mockModeActive ? 'mock mode active' : 'real/provider mode or offline'}</p>
          {telemetry.aais?.error ? <p>{telemetry.aais.error}</p> : null}
        </Panel>
        <Panel title="Contractors">
          <p>{String(telemetry.aais?.contractors?.length ?? 0)} contractor checks reported</p>
        </Panel>
      </div>
    </section>

    <section id="cab" style={sectionStyle}>
      <h2>CAB Continuity</h2>
      <div style={gridStyle}>
        <Metric label="Ledger" value={telemetry.cab?.available ? 'available' : 'empty'} />
        <Metric label="Entries" value={String(telemetry.cab?.entryCount ?? 0)} />
        <Metric label="Active" value={String(telemetry.cab?.activeCount ?? 0)} />
        <Metric label="Invariants" value={telemetry.cab?.invariants.passed ? 'pass' : 'review'} />
      </div>
      <div style={gridStyle}>
        <Panel title="Latest CAB Links">
          <p>Intent {telemetry.cab?.latest.intents[0] ?? 'none'}</p>
          <p>Decision {telemetry.cab?.latest.decisions[0] ?? 'none'}</p>
          <p>Evidence {telemetry.cab?.latest.evidenceChains[0] ?? 'none'}</p>
          <p>Receipt {telemetry.cab?.latest.continuityReceipts[0] ?? 'none'}</p>
        </Panel>
        <Panel title="Invariant Surface">
          <ul>
            {(telemetry.cab?.invariants.results ?? []).map((result) => (
              <li key={result.invariantId}>{result.invariantId}: {result.status}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>

    <ArenaModePanel arena={arenaMode} />

    <section style={sectionStyle}>
      <h2>Top Patterns</h2>
      <table>
        <thead><tr><th>Pattern</th><th>Fault codes</th><th>Recurrence</th><th>Last seen</th></tr></thead>
        <tbody>
          {telemetry.topPatterns.map((pattern) => (
            <tr key={pattern.patternId}>
              <td>{pattern.patternId}</td>
              <td>{pattern.faultCodes.join(', ')}</td>
              <td>{pattern.recurrence}</td>
              <td>{pattern.lastSeenAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>

    <PatchApprovals apiBase="" />
  </div>
);

function isProofSurfaceSummary(value: unknown): value is ProofSurfaceSummary {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'identity' in value &&
      'proofLevel' in value &&
      'commercialReadiness' in value &&
      'domain' in value &&
      'healthIndicator' in value,
  );
}

const sectionStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #dfe3e8',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid #23405f',
  borderRadius: 10,
  padding: '10px 14px',
  background: '#23405f',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#ffffff',
  color: '#23405f',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const groupSectionStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};

const groupHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const graphPillStyle: React.CSSProperties = {
  border: '1px solid #c8d4e3',
  borderRadius: 999,
  padding: '6px 12px',
  background: '#eef4ff',
  color: '#23405f',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const domainGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
};

const proofSurfaceCardStyle: React.CSSProperties = {
  appearance: 'none',
  border: '1px solid #d9e0ea',
  borderRadius: 14,
  padding: 14,
  background: '#ffffff',
  textAlign: 'left',
  cursor: 'pointer',
  display: 'grid',
  gap: 8,
};

const proofSurfaceCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'space-between',
  alignItems: 'center',
};

const proofSurfaceBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const domainBadgeStyles: Record<ProofSurfaceSummary['domain'], React.CSSProperties> = {
  Governance: { background: '#eef4ff', color: '#23405f' },
  Execution: { background: '#f2e8ff', color: '#5b21b6' },
  Runtime: { background: '#e8fff4', color: '#0f766e' },
  Intent: { background: '#fff4e8', color: '#9a3412' },
  Evidence: { background: '#f0f9ff', color: '#0369a1' },
  Verification: { background: '#ecfeff', color: '#155e75' },
  Replay: { background: '#f5f3ff', color: '#6d28d9' },
  Audit: { background: '#fdf2f8', color: '#be185d' },
  Interoperability: { background: '#f8fafc', color: '#475569' },
};

const healthBadgeStyles: Record<ProofSurfaceSummary['healthIndicator'], React.CSSProperties> = {
  Verified: { background: '#e7f7ef', color: '#146c43' },
  Experimental: { background: '#fff4d6', color: '#9a6700' },
  Simulated: { background: '#f1f5f9', color: '#475569' },
  Operational: { background: '#e0f2fe', color: '#075985' },
  'Commercially Available': { background: '#f3e8ff', color: '#6b21a8' },
};

const proofSurfaceCardTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: '#172026',
};

const proofSurfaceCardIdentityStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#5f6b7a',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const proofSurfaceCardMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  fontSize: 12,
  color: '#334155',
  fontWeight: 600,
};

const proofSurfaceCardSummaryStyle: React.CSSProperties = {
  color: '#172026',
  lineHeight: 1.5,
};

const proofSurfaceCardFooterStyle: React.CSSProperties = {
  color: '#5f6b7a',
  fontSize: 13,
  lineHeight: 1.5,
};

const profilePanelStyle: React.CSSProperties = {
  border: '1px solid #c9d5e4',
  borderRadius: 16,
  padding: 16,
  background: '#f8fbff',
  display: 'grid',
  gap: 16,
};

const profileHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'start',
};

const profileEyebrowStyle: React.CSSProperties = {
  color: '#23405f',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontSize: 11,
  fontWeight: 800,
};

const profileIdentityStyle: React.CSSProperties = {
  color: '#5f6b7a',
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const profileLeadStyle: React.CSSProperties = {
  margin: 0,
  color: '#334155',
  lineHeight: 1.6,
};

const profileTwoColumnStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
};

const relatedSurfaceLinkStyle: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  color: '#1d4ed8',
  padding: 0,
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left',
};

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ border: '1px solid #e3e7ed', borderRadius: 6, padding: 12 }}>
    <h3 style={{ marginTop: 0 }}>{title}</h3>
    {children}
  </div>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ border: '1px solid #e3e7ed', borderRadius: 6, padding: 12 }}>
    <div style={{ color: '#5f6b7a', fontSize: 12, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
  </div>
);

const BenchmarkCard: React.FC<{
  label: string;
  score: number;
  delta: number;
  markers: { current: number; previous: number; industry: number; topQuartile: number };
}> = ({ label, score, delta, markers }) => (
  <div style={{ border: '1px solid #e3e7ed', borderRadius: 6, padding: 12 }}>
    <div style={{ color: '#5f6b7a', fontSize: 12, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700 }}>{score}</div>
    <div style={{ height: 8, background: '#e8edf2', borderRadius: 4, position: 'relative', margin: '8px 0' }}>
      <span style={markerStyle(markers.industry, '#677483')} />
      <span style={markerStyle(markers.previous, '#9aa5b1')} />
      <span style={markerStyle(markers.topQuartile, '#2f6fed')} />
      <span style={markerStyle(markers.current, '#138a5e', 8)} />
    </div>
    <div>Delta {formatDelta(delta)}</div>
  </div>
);

const PROOF_SURFACE_DOMAIN_ORDER: ProofSurfaceSummary['domain'][] = [
  'Governance',
  'Execution',
  'Runtime',
  'Intent',
  'Evidence',
  'Verification',
  'Replay',
  'Audit',
  'Interoperability',
];

const ProofSurfaceKnowledgeGraph: React.FC<{
  surfaces: ProofSurfaceSummary[];
  selectedProofSurfaceId: string | null;
  onSelectedProofSurfaceChange: (value: string) => void;
}> = ({ surfaces, selectedProofSurfaceId, onSelectedProofSurfaceChange }) => {
  const groupedSurfaces = groupProofSurfacesByDomain(surfaces);
  const selectedSurface = findProofSurfaceById(surfaces, selectedProofSurfaceId) ?? surfaces[0];
  const verifiedCount = surfaces.filter((surface) => surface.healthIndicator === 'Verified').length;
  const operationalCount = surfaces.filter((surface) => surface.healthIndicator === 'Operational').length;
  const simulatedCount = surfaces.filter((surface) => surface.healthIndicator === 'Simulated').length;
  const commercialCount = surfaces.filter((surface) => surface.healthIndicator === 'Commercially Available').length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={gridStyle}>
        <Metric label="Surfaces" value={String(surfaces.length)} />
        <Metric label="Domains" value={String(groupedSurfaces.length)} />
        <Metric label="Verified" value={String(verifiedCount)} />
        <Metric label="Operational" value={String(operationalCount)} />
        <Metric label="Simulated" value={String(simulatedCount)} />
        <Metric label="Commercial" value={String(commercialCount)} />
      </div>

      {groupedSurfaces.map((group) => (
        <section key={group.domain} style={groupSectionStyle}>
          <div style={groupHeaderStyle}>
            <div>
              <h3 style={{ margin: 0 }}>{group.domain}</h3>
              <p style={{ margin: '4px 0 0', color: '#5f6b7a', fontSize: 13 }}>
                {group.surfaces.length} surface{group.surfaces.length === 1 ? '' : 's'}
              </p>
            </div>
            <div style={graphPillStyle}>Constitutional knowledge graph</div>
          </div>
          <div style={domainGridStyle}>
            {group.surfaces.map((surface) => (
              <ProofSurfaceCard
                key={surface.identity.id}
                surface={surface}
                selected={surface.identity.id === selectedSurface?.identity.id}
                onSelect={onSelectedProofSurfaceChange}
              />
            ))}
          </div>
        </section>
      ))}

      {selectedSurface ? (
        <ProofSurfaceProfilePanel
          surface={selectedSurface}
          surfaces={surfaces}
          onSelectSurface={onSelectedProofSurfaceChange}
        />
      ) : null}

      <RouterProofSurfaceCallout surfaces={surfaces} />
    </div>
  );
};

const ProofSurfaceCard: React.FC<{
  surface: ProofSurfaceSummary;
  selected: boolean;
  onSelect: (value: string) => void;
}> = ({ surface, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(surface.identity.id)}
    style={{
      ...proofSurfaceCardStyle,
      borderColor: selected ? '#1d4ed8' : '#d9e0ea',
      boxShadow: selected ? '0 0 0 2px rgba(29, 78, 216, 0.12)' : 'none',
    }}
  >
    <div style={proofSurfaceCardHeaderStyle}>
      <span style={{ ...proofSurfaceBadgeStyle, ...domainBadgeStyles[surface.domain] }}>{surface.domain}</span>
      <span style={{ ...proofSurfaceBadgeStyle, ...healthBadgeStyles[surface.healthIndicator] }}>{surface.healthIndicator}</span>
    </div>
    <div style={proofSurfaceCardTitleStyle}>{surface.identity.name}</div>
    <div style={proofSurfaceCardIdentityStyle}>{surface.identity.id}</div>
    <div style={proofSurfaceCardMetaStyle}>
      <span>Proof {surface.proofLevel}</span>
      <span>Maturity {surface.maturity}</span>
      <span>Replay {surface.replayStatus}</span>
    </div>
    <div style={proofSurfaceCardSummaryStyle}>{surface.whatItProves}</div>
    <div style={proofSurfaceCardFooterStyle}>{surface.truthBoundary}</div>
  </button>
);

const ProofSurfaceProfilePanel: React.FC<{
  surface: ProofSurfaceSummary;
  surfaces: ProofSurfaceSummary[];
  onSelectSurface: (value: string) => void;
}> = ({ surface, surfaces, onSelectSurface }) => {
  const relatedSurfaces = surface.relatedProofSurfaces
    .map((relatedId) => findProofSurfaceById(surfaces, relatedId))
    .filter((relatedSurface): relatedSurface is ProofSurfaceSummary => Boolean(relatedSurface));

  return (
    <div style={profilePanelStyle}>
      <div style={profileHeaderStyle}>
        <div>
          <div style={profileEyebrowStyle}>{surface.domain}</div>
          <h3 style={{ margin: '4px 0 0' }}>{surface.identity.name}</h3>
          <div style={profileIdentityStyle}>{surface.identity.id}</div>
        </div>
        <div style={{ ...proofSurfaceBadgeStyle, ...healthBadgeStyles[surface.healthIndicator] }}>{surface.healthIndicator}</div>
      </div>

      <p style={profileLeadStyle}>{surface.whatItProves}</p>

      <div style={gridStyle}>
        <Metric label="Proof level" value={surface.proofLevel} />
        <Metric label="Maturity" value={surface.maturity} />
        <Metric label="Verification" value={surface.verificationStatus} />
        <Metric label="Replay" value={surface.replayStatus} />
      </div>

      <div style={profileTwoColumnStyle}>
        <Panel title="What it proves">
          <p>{surface.whatItProves}</p>
        </Panel>
        <Panel title="What it does not prove">
          <p>{surface.whatItDoesNotProve}</p>
        </Panel>
        <Panel title="Current evidence">
          <ul>
            {surface.currentEvidence.map((evidence) => (
              <li key={evidence.id}>
                <strong>{evidence.id}</strong>: {evidence.statement}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Blindspots">
          <ul>{surface.blindspots.map((item) => <li key={item}>{item}</li>)}</ul>
        </Panel>
        <Panel title="Known limitations">
          <ul>{surface.knownLimitations.map((item) => <li key={item}>{item}</li>)}</ul>
        </Panel>
        <Panel title="Adversarial claims">
          <ul>{surface.adversarialClaims.map((item) => <li key={item}>{item}</li>)}</ul>
        </Panel>
        <Panel title="Battle scars">
          <ul>{surface.battleScars.map((item) => <li key={item}>{item}</li>)}</ul>
        </Panel>
        <Panel title="Dependencies">
          <ul>{surface.dependencies.map((item) => <li key={item}>{item}</li>)}</ul>
        </Panel>
        <Panel title="Related proof surfaces">
          {relatedSurfaces.length > 0 ? (
            <ul>
              {relatedSurfaces.map((relatedSurface) => (
                <li key={relatedSurface.identity.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSurface(relatedSurface.identity.id)}
                    style={relatedSurfaceLinkStyle}
                  >
                    {relatedSurface.identity.name} ({relatedSurface.domain})
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No related proof surfaces are currently linked in the graph.</p>
          )}
        </Panel>
        <Panel title="Graph metadata">
          <p><strong>Inputs:</strong> {surface.inputs.join(', ')}</p>
          <p><strong>Outputs:</strong> {surface.outputs.join(', ')}</p>
          <p><strong>Evidence receipts:</strong> {surface.evidenceReceipts.join(', ')}</p>
          <p><strong>Replay path:</strong> {surface.replayPath}</p>
          <p><strong>Verification path:</strong> {surface.verificationPath}</p>
          <p><strong>Truth boundary:</strong> {surface.truthBoundary}</p>
          <p><strong>Constitutional limits:</strong> {surface.constitutionalLimits}</p>
        </Panel>
      </div>
    </div>
  );
};

const RouterProofSurfaceCallout: React.FC<{ surfaces: ProofSurfaceSummary[] }> = ({ surfaces }) => {
  const routerSurface = findRouterSurface(surfaces);
  if (!routerSurface) {
    return null;
  }

  return (
    <div style={{ marginTop: 16, border: '1px solid #cad4e0', borderRadius: 8, padding: 16, background: '#f8fbff' }}>
      <h3 style={{ marginTop: 0 }}>SovereignX Router</h3>
      <p style={{ marginTop: 0 }}>
        CPU governance handles planning, continuity, throttling, and invariants while GPU acceleration handles matmul,
        attention, render passes, and physics.
      </p>
      <div style={gridStyle}>
        <Metric label="Proof Level" value={routerSurface.proofLevel} />
        <Metric label="Verification" value={routerSurface.verificationStatus} />
        <Metric label="Replay" value={routerSurface.replayStatus} />
        <Metric label="Operational" value={routerSurface.operationalStatus} />
      </div>
      <p style={{ marginBottom: 0, color: '#5f6b7a' }}>{routerSurface.truthBoundary}</p>
      <p style={{ marginBottom: 0 }}>
        Failure path: delay, throttle, quarantine, or drop governed work when invariants or CIEMS limits require it.
      </p>
    </div>
  );
};

function groupProofSurfacesByDomain(surfaces: ProofSurfaceSummary[]): { domain: ProofSurfaceSummary['domain']; surfaces: ProofSurfaceSummary[] }[] {
  const grouped = new Map<ProofSurfaceSummary['domain'], ProofSurfaceSummary[]>();
  for (const surface of surfaces) {
    const bucket = grouped.get(surface.domain) ?? [];
    bucket.push(surface);
    grouped.set(surface.domain, bucket);
  }

  return [
    ...PROOF_SURFACE_DOMAIN_ORDER.filter((domain) => grouped.has(domain)).map((domain) => ({
      domain,
      surfaces: grouped.get(domain) ?? [],
    })),
    ...[...grouped.keys()]
      .filter((domain) => !PROOF_SURFACE_DOMAIN_ORDER.includes(domain))
      .sort()
      .map((domain) => ({
        domain,
        surfaces: grouped.get(domain) ?? [],
      })),
  ];
}

function findProofSurfaceById(
  surfaces: ProofSurfaceSummary[],
  identity: string | null,
): ProofSurfaceSummary | undefined {
  if (!identity) {
    return undefined;
  }
  return surfaces.find((surface) => surface.identity.id === identity);
}

function findRouterSurface(surfaces: ProofSurfaceSummary[]): ProofSurfaceSummary | undefined {
  return surfaces.find((surface) =>
    surface.identity.id === '@aaes-os/sovereignx-router' ||
    surface.identity.name.toLowerCase().includes('sovereignx router') ||
    surface.identity.name.toLowerCase().includes('sovereignxrouter'),
  );
}

function markerStyle(value: number, color: string, size = 6): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${Math.max(0, Math.min(100, value))}%`,
    top: '50%',
    width: size,
    height: size,
    background: color,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
  };
}

function formatDelta(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
