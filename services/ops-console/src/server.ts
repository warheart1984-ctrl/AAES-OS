import express from 'express';

import { collectTelemetrySnapshot, initGovernanceGlobals } from '@aaes-os/aaes-governance';

import {
  approvePatch,
  deployPatch,
  listPatches,
  rejectPatch,
} from './patchLedgerState.js';

const PORT = Number(process.env.PORT ?? 4000);

initGovernanceGlobals();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/telemetry', (_req, res) => {
  const snapshot = collectTelemetrySnapshot(10);
  res.json({
    drift: snapshot.drift,
    topPatterns: snapshot.topPatterns,
    lastFaults: snapshot.lastFaults,
    patchTimeline: snapshot.patchTimeline,
  });
});

app.get('/patches', (_req, res) => {
  res.json({ patches: listPatches() });
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`AAES-OS ops-console listening on http://localhost:${PORT}`);
    console.log(`  GET /telemetry`);
  });
}

export { app };
