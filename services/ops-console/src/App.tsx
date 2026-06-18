import React, { useEffect, useState } from 'react';

import { PatchApprovals } from './PatchApprovals.js';

type DriftScore = {
  score: number;
  totalFaults: number;
  uniquePatterns: number;
  topPatterns: PatternRecord[];
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

type TelemetryResponse = {
  drift: DriftScore;
  topPatterns: PatternRecord[];
  lastFaults: FaultEvent[];
  patchTimeline?: PatchPoint[];
};

type PatchPoint = {
  patchId: string;
  timestamp: string;
  effectiveness: number;
};

export const App: React.FC = () => {
  const [data, setData] = useState<TelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTelemetry = async () => {
      setLoading(true);
      const res = await fetch('/telemetry');
      const json = (await res.json()) as TelemetryResponse;
      setData(json);
      setLoading(false);
    };
    fetchTelemetry();
    const id = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading || !data) return <div>Loading telemetry…</div>;

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16 }}>
      <h1>AAES‑OS Ops Console</h1>

      <section>
        <h2>Drift</h2>
        <p>
          <strong>Score:</strong> {data.drift.score}{' '}
          <small>(0 = stable, 1 = high drift)</small>
        </p>
        <p>
          <strong>Total faults:</strong> {data.drift.totalFaults} |{' '}
          <strong>Unique patterns:</strong> {data.drift.uniquePatterns}
        </p>
      </section>

      <section>
        <h2>Top Patterns</h2>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Fault codes</th>
              <th>Invariants</th>
              <th>Recurrence</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {data.topPatterns.map((p) => (
              <tr key={p.patternId}>
                <td>{p.patternId}</td>
                <td>{p.faultCodes.join(', ')}</td>
                <td>{(p.invariantIds || []).join(', ')}</td>
                <td>{p.recurrence}</td>
                <td>{p.lastSeenAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Last 10 Faults</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Run</th>
              <th>Span</th>
              <th>Code</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {data.lastFaults.map((f) => (
              <tr key={f.faultId}>
                <td>{f.timestamp}</td>
                <td>{f.runId}</td>
                <td>{f.spanId}</td>
                <td>{f.faultCode}</td>
                <td>{f.severity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data.patchTimeline && (
        <section>
          <h2>Patch Effectiveness Timeline</h2>
          <ul>
            {data.patchTimeline.map((p) => (
              <li key={`${p.patchId}-${p.timestamp}`}>
                [{p.timestamp}] {p.patchId} → effectiveness {p.effectiveness}
              </li>
            ))}
          </ul>
        </section>
      )}

      <PatchApprovals apiBase="" />
    </div>
  );
};
