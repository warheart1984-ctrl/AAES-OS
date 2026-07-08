# SovereignX Router

Governed compute router for the AAES-OS workspace.

## What it proves

- CPU governs scheduling, continuity, and policy
- GPU receives only work that the router allows
- CIEMS-style constraints can throttle, delay, quarantine, or drop work

## Who it is for

- developers building governed compute substrates
- operators who need explicit resource fairness
- reviewers who need a machine-readable proof surface

## How to verify it works

```bash
corepack pnpm --filter @aaes-os/sovereignx-router test
corepack pnpm --filter @aaes-os/sovereignx-router build
```

## Proof surface

This package exposes a proof surface at `src/proofSurface.ts` and validates it with the shared AAES proof-surface law.

## Failure path

If governance detects hot GPU, VRAM exhaustion, intent mismatch, or budget violation, the router degrades to CPU, delays the work, or drops/quarantines it.
