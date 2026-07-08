# AAES-OS Monorepo

pnpm workspace for the AAES-OS governed runtime, docs, and tooling packages. The legacy v1 cognitive runtime (`src/`, HTTP orchestrator) remains at the repo root for backward compatibility.

Canonical scorecard: [docs/scorecards/project-infi.md](./docs/scorecards/project-infi.md)

Docs hub: [docs/README.md](./docs/README.md)

## Constitutional Alignment

This monorepo operates under the **Unified Sovereign Specification v1.0.0** and **Prime Architect Constitutional Blueprint**:

- **7-Layer Architecture Model** - Constitutional Substrate (L0) through Governance & Observability (L6)
- **UCDD Standards Bundle v1.2.0** - Full compliance with S-001 through S-007
- **Section 2.1.2 Immutability Doctrine** - Constitutional artifacts are frozen
- **Section 2.1.3 Traceability Imperative** - All artifacts have traceability links

## Layout

```
aaes-os/
  packages/
    runledger/          # RunLedgerStore — runs, spans, invariant links
    trace-bus/          # TraceBusClient — pub/sub trace events
    aaes-governance/    # InvariantEngine + FaultJournalStore + governance loop
    ucr-runtime/        # Governed UCRRuntime execution path
    tri-core-protocol/  # Governance triad types + patch ledger
  services/
    ops-console/        # React UI + Express telemetry + Prometheus /metrics
  infra/
    grafana/            # aaes-os-dashboard.json
    prometheus/         # scrape config snippet
  tools/                # placeholder — CLI/dev tools
  docs/                 # workspace-local docs pointer
  tests/integration/    # cross-package spine tests
  src/                  # legacy AAES-OS v1 orchestrator (unchanged)
```

## Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9

## Install

```bash
cd project-infi
pnpm install
```

## Release

```bash
pnpm run release
```

That command builds the release checksums, packages the selected artifacts under `release/bundle/`, signs the bundle, and verifies the result against the manifest.

## Build

```bash
pnpm build          # all workspace packages
pnpm build:legacy   # legacy src/ orchestrator (npm/tsc root tsconfig)
```

## Test

```bash
pnpm test           # build packages + vitest (unit + integration)
pnpm test:packages  # per-package vitest where configured
pnpm test:legacy    # legacy node:test suite
```

## Ops Console

Telemetry UI and Prometheus metrics for drift, fault patterns, and patch effectiveness.

```bash
cd project-infi
pnpm install
pnpm --filter @aaes-os/ops-console dev
```

- Vite UI: http://localhost:5173 (proxies `/telemetry` and `/metrics` to port 4000)
- API: http://localhost:4000
- `GET /telemetry` — JSON `{ drift, topPatterns, lastFaults, patchTimeline }`
- `GET /metrics` — Prometheus exposition (`aaes_drift_score`, `aaes_fault_events_total`, `aaes_fault_pattern_recurrence`)

Production:

```bash
pnpm --filter @aaes-os/ops-console build
pnpm --filter @aaes-os/ops-console start
```

Import Grafana dashboard from `infra/grafana/aaes-os-dashboard.json`. Prometheus scrape target: `localhost:4000` (see `infra/prometheus/prometheus.yml`).

Demo seed data (20 faults for `INV_FAIL_INV_OUTPUT_SHAPE` / `INV_FAIL_INV_DETERMINISM`, plus 2 patch samples) loads on server startup.

## Package dependency graph (Phase 2)

```
runledger  ←  trace-bus
    ↑            ↑
    └──── ucr-runtime (governed path)
aaes-governance → runledger (types)
tri-core-protocol (governance triad + patch ledger)
```

## Architecture Mapping

See [docs/architecture/README.md](./docs/architecture/README.md) for the architecture tree and the current wiring map.

## Phase status

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Workspace shell, branded types, package.json/tsconfig | Done |
| 2 | In-memory RunStore, TraceBusClient, integration test | Done |
| 3 | Governance + UCR + tri-core wired | Governed runtime path wired with trace receipts and replay evidence |
| 4 | Ops Console service | Done (`services/ops-console`) |
| 5 | Infra / persistence | Grafana + Prometheus snippets |

The runtime blocker set (`packages/runledger`, `packages/trace-bus`, `packages/evidence-receipts`) is now treated as green for the governed runtime core.

## Canonical Scorecard Snapshot

| Field | Value |
|-------|-------|
| Repository purpose | AAES-OS governance spine, runtime packages, ops console, docs, and release scaffolding |
| Current maturity | Verified Prototype for the governance/runtime spine; scaffold / prototype elsewhere |
| Build status | Fresh build passes for the verified governance and ops-console surfaces in this pass |
| Test status | Fresh package tests pass for the verified governance and ops surfaces in this pass |
| Smoke test status | Ops console and workspace smoke paths are documented; release smoke remains a next milestone |
| Documentation status | Canonical scorecard, docs hub, and docs-site overview are now wired |
| Replay/Audit capability | RunLedger, evidence receipts, docs coverage manifest, and fault journal artifacts are present |
| Known gaps | Real ESLint, fully runnable docs-site, production Nova Studio pipeline, release packaging completion |
| Next milestone | Finish the repo-wide scorecard rollout, then close the remaining lint/docs/UI gaps |

## Proof Surface

| Field | Value |
|-------|-------|
| Identity | `project-infi` canonical proof surface for AAES-OS |
| Purpose | Connect governance, implementation, verification, and commercialization through a single evidence layer |
| Claim | The repo exposes a governed baseline with documented truth boundaries and replay paths |
| Evidence | Build output, test output, docs-site output, scorecards, and operational telemetry |
| Verification | Fresh build, test, smoke, replay, and docs checks are required for verified status |
| Replay | RunLedger, evidence receipts, and audit-linked docs provide continuity where available |
| Operational Status | Verified Prototype for the governance/runtime spine and ops surfaces; other surfaces remain scaffold/prototype |
| Truth Boundary | The repo does not claim production readiness for unfinished surfaces |
| Constitutional Profile | Authority, evidence, verification, compliance, scope, and limits are documented below |
| Blindspots | Real ESLint, fully runnable docs-site, Nova Studio pipeline, release packaging |
| Adversarial Claims | README or scorecard content can be mistaken for fresh verification without matching evidence |
| Battle Scars | Placeholder lint gates and overextended readiness language |
| Color-Team Readiness | Red/Blue/Purple/Green/Yellow/White readiness is documented in the scorecard and docs hub |
| Commercial Readiness | Builder tier with prototype-to-verified-prototype progression |
| Next Evidence Required | Fresh lint remediation, docs-site build completion, and release packaging evidence |
| Proof Level | P2-Verified for the governed baseline; lower levels apply to unfinished surfaces |

## Constitutional Freeze

Constitutional artifacts are frozen per Section 2.1.2 Immutability Doctrine. To check freeze status:

```bash
python constitutional_freeze.py check
```

To verify integrity:

```bash
python constitutional_freeze.py verify
```

## UCDD Compliance

This repository maintains full compliance with UCDD Standards Bundle v1.2.0:

- **S-001** - Conformance Evidence Requirements
- **S-002** - Traceability Linkage Protocol
- **S-003** - Version Sovereignty
- **S-004** - Layered Authority and Delegation
- **S-005** - Audit and Inspection Protocol
- **S-006** - Constitutional Amendment Governance
- **S-007** - AI Agent Compliance

## Constitutional References

- **Unified Sovereign Specification v1.0.0** - Section 2.1 Constitutional Foundations
- **UCDD Standards Bundle v1.2.0** - Standards S-001 through S-007
- **Prime Architect Constitutional Blueprint** - Immutability Doctrine

## Evidence Hierarchy

| Layer | Repo treatment |
|-------|----------------|
| Constitutional Governance | AAES governance packages, tri-core protocol, runtime governance rules |
| Software Architecture | workspace package layout, services, docs, simulation, and deployment scaffolds |
| Implementation | TypeScript packages, Express service code, UI scaffolds, and tests |
| Verification Evidence | package build output, package tests, docs coverage, and ledger-related records |
| Operational Evidence | ops-console telemetry, metrics, and service routes |
| Adoption Evidence | README docs, scorecards, and operator-facing documentation |

## Proof Surface Notes

- Every constitutional claim in this repository should point back to a proof surface field.
- Implemented, verified, operational, and commercially available are distinct states.
- No repository claim should exceed the evidence presented on its proof surface.
- The machine-readable CPS runtime now lives in `@aaes-os/aaes-governance` and can be consumed by dashboards or studio tools.

## Constitutional Profile Extensions

### Constitutional Scope

This repo governs AAES-OS runtime coordination, operator visibility, evidence capture, and constitutional documentation.

### Constitutional Limits

It does not yet govern the remaining scaffolded release and UI surfaces as production-complete artifacts.

### Dependencies

- pnpm workspace tooling
- TypeScript packages
- Ops console telemetry stack
- Docs site and scorecard artifacts

### Stewardship / Maintainers

The workspace steward is the AAES-OS / Nova constitutional runtime collaboration set.

## Maturity Progression

Scaffold -> Prototype -> Verified Prototype -> Reference Implementation -> Production Candidate -> Production

## Community and Commercialization

| Question | Answer |
|----------|--------|
| Who benefits from this? | Developers, operators, researchers, governance teams, and future collaborators |
| Who should contribute? | Contributors who can improve governance, docs, runtime wiring, and verification |
| What customer problem does it solve? | It reduces ambiguity by pairing constitutional governance with evidence-backed runtime surfaces |
| What free capability does it provide? | A working governed runtime workspace, docs, telemetry, and scorecards |
| What commercial capability could eventually be built on top of it? | Governed runtime deployments, operator tooling, advisory services, and productized evidence layers |

## Blindspots

- Known architectural blindspots: the docs-site and Nova Studio are still not fully production-runnable
- Known governance blindspots: some surfaces remain scaffolded and cannot yet claim verified readiness
- Known replay/audit blindspots: fresh replay verification is not yet complete across every surface
- Known operational blindspots: real ESLint and full release packaging are still missing
- Known adoption blindspots: external collaborators still need a simpler first-run path

## Adversarial Claims

- What adversarial actors could claim: that every surface is production ready
- What adversarial actors could exploit: the gap between scaffolded docs and fresh smoke verification
- What adversarial actors could misinterpret: a scorecard link as proof of total system completion
- What adversarial actors could falsify: readiness language without fresh test and smoke evidence
- What adversarial actors could bypass: informal assumptions that skip governance evidence

## Battle Scars

- Past failures: placeholder lint command
- Past regressions: docs and UI surfaces outpaced the verification story
- Past outages: not recorded in this scorecard yet
- Past misconfigurations: partial scaffolds presented as if they were finished products
- Past governance violations: overclaiming readiness without fresh evidence
- Past replay failures: replay coverage is present but not yet universal
- Past test failures: some surfaces still require fresh full verification
- Past architectural mistakes: the workspace grew faster than the canonical audit baseline

## Color-Team Readiness

| Team | Readiness |
|------|-----------|
| Red Team | Partial: attack surface exists in scaffolds and incomplete verification paths |
| Blue Team | Partial: monitoring and fault surfaces exist, but not every route is fully exercised |
| Purple Team | Emerging: attack/defense reconciliation is possible through docs and telemetry, not yet universal |
| Green Team | Partial: build/test stability exists in verified packages, but CI completeness is still evolving |
| Yellow Team | Partial: operator clarity is improved by scorecards, but not all surfaces are user-ready |
| White Team | Strongest current layer: governance, evidence language, and authority boundaries are documented |

## Governing Claim Rule

No repository should claim more than its evidence supports.

## Evidence Status Taxonomy

- Observed - verified by implementation, testing, or operational evidence
- Hypothesized - expected based on architecture but not yet verified
- Unknown - not yet evaluated

## Scorecard Principles

- No repository should claim more than its evidence supports
- Every architectural claim should identify the evidence that supports it
- Every limitation should be explicitly documented rather than implied
- Every maturity level should be tied to objective verification criteria

## Future Validation

- Open research questions
- Planned verification work
- Planned red-team exercises
- Planned interoperability tests
- Planned performance benchmarks
