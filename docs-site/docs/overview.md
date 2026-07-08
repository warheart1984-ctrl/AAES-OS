# Overview

AAES-OS is a governed cognitive runtime with a constitutional loop, persistent ledgering, and substrate-aware safety controls.

## Canonical baseline

- Governance doctrine: [doctrine](./governance/doctrine.md)
- Governance invariants: [invariants](./governance/invariants.md)
- Runtime core: [runtime-core](./runtime/runtime-core.md)

## What this proves

This repository proves the AAES-OS workspace has a canonical constitutional baseline, a live scorecard, and a consistent evidence model for build, test, smoke, replay, and documentation readiness.

## Who it is for

- Operators who need a concise readiness view
- Contributors who need the repo constitution and gaps
- Reviewers who need a stable audit surface

## How to verify it works

- Open the workspace scorecard
- Open the architecture tree [docs/architecture/README.md](../../docs/architecture/README.md)
- Confirm the README links point to live docs
- Run the repository build and test commands listed in the scorecard

## How it fits the Constitutional Computing Stack

The docs layer sits above implementation and below human review. It explains the governance contract, the truth boundary, and the current readiness of the workspace.

## Evidence Hierarchy

- Constitutional Governance: AAES governance packages and the scorecard template
- Software Architecture: docs-site pages and linked workspace structure
- Implementation: Markdown content and documentation components
- Verification Evidence: scorecards, coverage manifests, and linked build/test output
- Operational Evidence: ops-console metrics and runtime routes
- Adoption Evidence: operator docs, README links, and reviewer-facing summaries

## Proof Surface Runtime

### Identity

`docs-site` Proof Surface Runtime for the AAES-OS documentation layer.

### Purpose

Expose a standardized evidence layer for claims about the workspace baseline, governance contract, and readiness state.

### Claim

The docs site proves that the workspace has a coherent constitutional documentation layer and a visible readiness baseline.

The machine-readable CIEMS Proof Surface Runtime is exported by `@aaes-os/aaes-governance` so dashboards and studio tools can consume it directly.

### Evidence

- Static docs build output
- Canonical scorecard links
- Workspace README and docs hub references
- Documentation pages for governance, runtime, agents, and ULX

### Verification

Fresh docs build and smoke checks are required before this page can support a verified claim.

### Replay

Documentation can be rebuilt from source and re-read as a static artifact; replay depends on the upstream evidence it links to.

### Operational Status

Runnable static docs app, not the final production product.

### Truth Boundary

This page does not prove runtime completion or production readiness for unfinished surfaces.

### Constitutional Profile

- Purpose: workspace documentation and readiness baselines
- Authority: AAES governance packages and scorecard template
- Evidence model: docs output, scorecards, and linked build/test evidence
- Verification process: fresh build, smoke, and linked evidence review
- Compliance requirements: no claim beyond presented evidence
- Constitutional scope: documentation and readiness baselines
- Constitutional limits: does not replace the runtime or service build outputs

### Blindspots

- Docs-site is still a Proof Surface Runtime, not the runtime
- Some linked surfaces remain scaffolded or prototype-only
- Fresh replay verification is not fully universal

### Adversarial Claims

- The docs site can be mistaken for product completion
- Scorecard references can be mistaken for live verification
- Readiness language can be overstated without current evidence

### Battle Scars

- Placeholder lint gates
- Documentation previously raced ahead of runnable release surfaces
- Partial scaffolds were easy to overstate

### Color-Team Readiness

| Team | Readiness |
|------|-----------|
| Red Team | Partial: the surface explains exposure but does not remove it |
| Blue Team | Partial: it points to evidence, but upstream verification still matters |
| Purple Team | Useful for reconciling claims and proofs |
| Green Team | Supports stable docs and repeatable checks |
| Yellow Team | Improves operator clarity and safe interpretation |
| White Team | Anchors authority and truth boundaries |

### Commercial Readiness

- Target CIEMS Tier: Builder
- Intended customer: operators, reviewers, contributors, and external collaborators
- Primary use case: canonical documentation and readiness inspection
- Value proposition: a transparent documentation Proof Surface Runtime for the governed runtime workspace
- Current commercialization readiness: prototype-level documentation layer

### Next Evidence Required

- Fresh docs build verification
- Stronger replay linkage to runtime evidence
- Wider consistency across all repo scorecards

## Constitutional Profile Extensions

- Constitutional Scope: workspace documentation and readiness baselines
- Constitutional Limits: does not replace the runtime or service build outputs
- Dependencies: docs hub, repo README, and workspace package evidence
- Stewardship / Maintainers: documentation and governance owners

## Maturity Progression

Scaffold -> Prototype -> Verified Prototype -> Reference Implementation -> Production Candidate -> Production

## Community and Commercialization

- Who benefits from this? Operators, reviewers, contributors, and external collaborators
- Who should contribute? People improving docs clarity, evidence traceability, and constitutional framing
- What customer problem does it solve? It gives a quick path to understanding readiness and scope
- What free capability does it provide? A canonical overview of the governed runtime workspace
- What commercial capability could eventually be built on top of it? Documentation, onboarding, and governance consulting materials

## Blindspots

- Docs-site is still an overview layer and not the final runnable product
- Some linked surfaces remain scaffolded or prototype-only
- Fresh replay verification is not fully universal

## Adversarial Claims

- The overview can be mistaken for runtime completion
- The scorecard can be mistaken for a fresh test run
- Readiness language can be overstated without evidence

## Battle Scars

- Placeholder lint and unfinished UI surfaces still need work
- Documentation has sometimes raced ahead of runnable release surfaces

## Color-Team Readiness

| Team | Readiness |
|------|-----------|
| Red Team | Partial: the overview explains exposure but does not remove it |
| Blue Team | Partial: it points to evidence, but upstream verification still matters |
| Purple Team | Useful for reconciling claims and proofs |
| Green Team | Supports stable docs and repeatable checks |
| Yellow Team | Improves operator clarity and safe interpretation |
| White Team | Anchors authority and truth boundaries |

## Governing Claim Rule

No repository should claim more than its evidence supports.
