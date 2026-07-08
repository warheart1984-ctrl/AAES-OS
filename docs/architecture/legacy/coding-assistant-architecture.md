# AAES-OS Super-Platform Architecture

## Overview

The AAES-OS super-platform evolves the governed runtime into two integrated layers:

1. **Planet-Scale Organism Mesh (PSOM)** — global mesh discovery, routing, governance enforcement, load balancing, and cross-organism execution.
2. **Self-Governing Capability Economy (SGCE)** — capability tokenization, provenance, marketplace, pricing, lifecycle, and semantic versioning.

Both layers build on existing packages: `@aaes-os/governed-runtime`, `@aaes-os/aaes-governance`, `@aaes-os/federation`, and `@aaes-os/sovren`.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Developer Surface                            │
│  Next.js Dashboard (/developer, /mesh, /governance)             │
│  mesh CLI · TypeScript SDK · Python SDK · REST API              │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   @aaes-os/platform-sdk                          │
│              LocalPlatform · PlatformClient (REST)               │
└───────┬──────────────────────────────┬──────────────────────────┘
        │                              │
┌───────▼──────────┐          ┌────────▼─────────┐
│  @aaes-os/psom-mesh         │  @aaes-os/sgce   │
│  Discovery · Routing        │  Tokens · Market │
│  Load Balance · Drift       │  Provenance · $  │
│  Quarantine · Invariants    │  Lifecycle · SemVer│
└───────┬──────────┘          └────────┬─────────┘
        │                              │
        └──────────────┬───────────────┘
                       │
              ┌────────▼─────────┐
              │ @aaes-os/platform-core │
              │ Auth · Billing · Profiles │
              │ Version Registry · Invoke │
              └────────┬─────────┘
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
┌────▼────┐    ┌───────▼──────┐   ┌─────▼─────┐
│ governed│    │ aaes-governance│   │ federation│
│ runtime │    │ invariants     │   │ handshake │
└─────────┘    └────────────────┘   └───────────┘
```

## Package Layout

| Package | Path | Role |
|---------|------|------|
| `platform-core` | `packages/platform-core` | Auth, billing, governance profiles, semver registry, invoke |
| `psom-mesh` | `packages/psom-mesh` | Mesh discovery, routing, load balancing, drift, quarantine |
| `sgce` | `packages/sgce` | Tokenization, marketplace, provenance, pricing, lifecycle |
| `platform-sdk` | `packages/platform-sdk` | TypeScript/JS SDK (local + REST client) |
| `platform-api` | `services/platform-api` | REST API server (Express) |
| `platform-web` | `services/platform-web` | Next.js developer dashboard |
| `mesh-cli` | `tools/mesh-cli` | Mesh-aware CLI |
| `mesh-simulator` | `simulation/mesh-simulator` | Multi-organism stress simulator |
| Python SDK | `sdk/python` | `aaes-os-sdk` PyPI-ready package |

## Global Governance Layer

Three selectable governance modes with integrated billing, marketplace, and API access:

| Mode | Risk Threshold | Marketplace | Key Behaviors |
|------|-----------------|-------------|---------------|
| **Strict** | low | blocked | read, analyze, recommend |
| **Balanced** | medium | allowed | + execute-approved, publish-capability |
| **Experimental** | high | allowed | + mesh-share, cross-organism-route |

Multi-profile negotiation occurs at mesh peer registration. Drift detection scans observed vs expected profiles across nodes.

## PSOM — Planet-Scale Organism Mesh

- **MeshRegistry** — global node discovery and registration
- **MeshRouter** — governance-safe routing for workflows, capabilities, agent messages
- **MeshLoadBalancer** — round-robin with failover
- **MeshInvariantEngine** — mesh-level invariant checks
- **DriftDetector** — mesh-wide governance drift reports
- **AdversarialQuarantine** — capability isolation
- **PsomMesh** — unified orchestrator with cross-organism execution

## SGCE — Self-Governing Capability Economy

- **CapabilityTokenizer** — non-financial governance-tracked entitlement units
- **ProvenanceTracker** — lineage depth and trust scoring
- **CapabilityMarketplace** — cross-organism listings with ratings
- **PricingEngine** — rental, subscription, federation pricing
- **CapabilityLifecycle** — publish, upgrade, deprecate, retire with dependency graphs
- **SgceEconomy** — unified orchestrator

## REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/login` | Create session |
| POST | `/auth/keys` | Create API key |
| GET | `/auth/keys` | List API keys |
| GET | `/capabilities` | List capabilities |
| POST | `/capabilities/publish` | Publish capability |
| POST | `/capabilities/invoke` | Invoke capability |
| GET | `/billing/usage` | Usage summary |
| GET | `/governance/profiles` | List governance profiles |
| GET | `/governance/drift` | Drift report |
| GET | `/governance/compare` | Profile comparison |
| GET | `/mesh/topology` | Mesh topology |
| POST | `/mesh/connect` | Connect organism |
| GET | `/marketplace` | Search marketplace |
| POST | `/marketplace/list` | Create listing |

## Developer Workflow

```bash
# Install dependencies
cd project-infi && pnpm install

# Build all packages
pnpm build

# Start API + Web
pnpm platform:api    # http://localhost:4100
pnpm platform:web    # http://localhost:3000/developer

# CLI
pnpm mesh -- login --owner dev-1
pnpm mesh -- keys create --label dev
pnpm mesh -- publish --id cap.analyze --version 1.0.0 --name Analyze

# Simulator
pnpm mesh:simulate
```

## Semantic Versioning

Capabilities use strict semver (`MAJOR.MINOR.PATCH`). The `VersionRegistry` enforces:

- Compatibility checks against governance profile invariants
- Risk threshold validation
- Upgrade/downgrade flows with strict-profile major downgrade blocking
- Dependency graphs via `CapabilityLifecycle.dependencyGraph()`

## Stress Testing

The mesh simulator (`simulation/mesh-simulator`) provides:

- **load** — 5 organisms, 50 messages each, capability publishing
- **governance-drift** — profile mismatch injection and drift scanning
- Adversarial quarantine simulation

## Integration with Existing Runtime

- **Governed Runtime** — cognitive risk types and policy routing feed governance profiles
- **Federation** — optional `FederationManager` integration in `PsomMesh`
- **AAES Governance** — invariant engine patterns extended at mesh level
- **Ops Console** — complementary telemetry; platform-web adds developer/mesh/governance views
