# Docs Hub

This directory is the canonical documentation entrypoint for `E:\project-infi`.

## Canonical Links

- [Repository scorecard](./scorecards/project-infi.md)
- [Scorecard template](./scorecards/REPO_SCORECARD_TEMPLATE.md)
- [Architecture tree](./architecture/README.md)
- [Architecture mapping](./architecture/AAES_OS_UCR_MAPPING.md)
- [Docs-site overview](../docs-site/docs/overview.md)
- [Workspace README](../README.md)

## What this proves

The docs layer proves that the repository now has a canonical constitutional baseline, a reusable scorecard format, and a single place to inspect evidence and remaining gaps.

## Who it is for

- Operators who need a quick readiness check
- Contributors who need the repo constitution and evidence model
- Reviewers who need a stable audit surface

## How to verify it works

- Open [docs/scorecards/project-infi.md](./scorecards/project-infi.md)
- Open [docs-site/docs/overview.md](../docs-site/docs/overview.md)
- Confirm the README links resolve from the repository root

## How it fits the Constitutional Computing Stack

The docs hub is the evidence and audit layer that sits above implementation code and below human review. It explains governance, replay, verification, and the repo's current truth boundary.

## Filing map

- Current architecture and wiring guidance lives in [docs/architecture/AAES_OS_UCR_MAPPING.md](./architecture/AAES_OS_UCR_MAPPING.md)
- The architecture tree index lives in [docs/architecture/README.md](./architecture/README.md)
- Legacy runtime notes live in [docs/runtime/legacy/ai-organism.md](./runtime/legacy/ai-organism.md)
- Legacy architecture notes live in [docs/architecture/legacy/coding-assistant-architecture.md](./architecture/legacy/coding-assistant-architecture.md)

## Evidence Status Taxonomy

- Observed - verified by implementation, testing, or operational evidence
- Hypothesized - expected based on architecture but not yet verified
- Unknown - not yet evaluated

## Proof Surface

Every docs artifact should expose the same proof-surface questions:

- What is being claimed?
- What evidence supports the claim?
- Who verified it?
- Can it be independently replayed?
- What are the current truth boundaries?
- What is still unknown?
- What evidence is required to advance its maturity?

### Constitutional Proof Levels

- P0 - Concept
- P1 - Implemented
- P2 - Verified
- P3 - Operational
- P4 - Independently Verified
- P5 - Mission-Critical

### Evidence State Separation

- Implemented
- Verified
- Operational
- Commercially Available

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
