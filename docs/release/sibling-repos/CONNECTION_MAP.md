# Sibling Repo Connection Map

:::info Documentation status
This page records **local discovery evidence**, **fail-closed adapter contracts**, **runtime federation decision machinery**, and the **long-term connection ladder** for AAES-family checkouts on Drive `G:\`.
It does **not** claim live federation grants, shared runtime authority, or API mesh connectivity between products unless a valid handshake receipt is indexed.
:::

## Long-term ladder (authoritative order)

```text
1. Discovery registry
2. Local evidence probe
3. Canonical inheritance (project-infi)
4. Adapter contracts          ← active (fail-closed, receipt-backed)
5. Runtime federation         ← machinery ready; live grants denied until promotion
```

See [FEDERATION_LADDER.md](./FEDERATION_LADDER.md) for step status and promotion conditions.

Do not skip layers. Runtime federation live grants stay **denied** until adapters pass, a transport is tested, and a valid handshake receipt is indexed.

## Why this order

| Layer | Why first / later |
| --- | --- |
| Discovery + probe | Prevents inventing remotes or maturity claims without checkout evidence |
| Canonical inheritance | Drive-G-2: `project-infi` is the authoritative Project Infinity scorecard source for this clone |
| Adapter contracts | Fail-closed checks: verified discovery + remote match + required artifacts (+ receipt fields when declared) |
| Runtime federation | Requires declared/tested transport + handshake receipts; `@aaes-os/federation` is in-process only and is not step-5 live mesh |

## CCRs

| CCR | Role |
| --- | --- |
| **CCR-AAES-OS-SiblingRepoDiscovery** | Discovery + canonical lineage inheritance |
| **CCR-AAES-OS-SiblingAdapterContracts** | Fail-closed adapter contracts for verified remotes (checkout authority) |
| **CCR-AAES-OS-RuntimeFederation** | Live mesh authority via handshake receipts + transport descriptors |

## Commands

```bash
# Refresh sibling discovery evidence
npm run siblings:evidence

# Evaluate fail-closed adapter contracts (also refreshes discovery)
npm run siblings:adapters

# Promote Declared transports → Tested (writes transport test receipts)
npm run transports:test

# Evaluate runtime federation decisions (fail-closed; no fake grants)
npm run siblings:federation

# Refresh hardening (discovery + adapters + federation + runtime surface packets)
npm run hardening:evidence
```

## Artifacts

| Artifact | Path |
| --- | --- |
| Registry | `docs/release/sibling-repos/sibling-repo-registry.json` |
| Evidence index | `docs/release/sibling-repos/sibling-repo-evidence-index.json` |
| Adapter registry | `docs/release/sibling-repos/adapters/adapter-contract-registry.json` |
| Adapter evidence | `docs/release/sibling-repos/adapters/adapter-contract-evidence-index.json` |
| Per-adapter receipts | `docs/release/sibling-repos/adapters/receipts/*.json` |
| Federation ladder | `docs/release/sibling-repos/FEDERATION_LADDER.md` |
| Transport registry | `docs/release/sibling-repos/federation/transport-descriptor-registry.json` |
| Transport test receipts | `docs/release/sibling-repos/federation/transport-test-receipts/*.json` |
| Handshake evidence | `docs/release/sibling-repos/federation/handshake-receipt-evidence-index.json` |
| Session lineage | `docs/release/sibling-repos/federation/session-lineage-log.json` |
| Probe tools | `tools/sibling-repo-evidence.ts`, `tools/sibling-adapter-contracts.ts`, `tools/transport-test.ts`, `tools/runtime-federation.ts` |
| Inheritance | `release/sibling-evidence-inheritance.ts` |
| Hardening attachment | `production-hardening-index.json` → `siblingRepoMesh` + `siblingAdapterContracts` + `siblingRuntimeFederation` |

## Adapter contract rules (fail-closed)

An adapter **passes** only when all of the following hold:

1. Sibling discovery status is `verified`
2. Observed git origin matches the expected remote
3. Every required artifact exists on disk
4. Any declared constitutional receipt requirements (`receiptHash`, `constitutionalMaturity`) are present and parseable

Otherwise the verdict is **fail**. Soft-pass is not allowed.

**Mythar** is deferred until discovery remotes verify.

## Runtime federation rules (fail-closed)

Live session **allow** only when:

1. Verified adapter for `remoteId`
2. Transport maturity **Tested** (trials) or **Certified** (production) — `tested=true`
3. Valid `CRC-AAES-OS-HandshakeReceipt` (hash, maturity, time window, non-empty `revocationPath`)

Declared/Configured transports are **NotEligible**. Verified adapters + Tested transport without receipt ⇒ `HandshakePending`. Empty receipt storage ⇒ **no** `FederationGranted`.

## Status meanings (discovery)

| Status | Meaning |
| --- | --- |
| `verified` | Path exists, expected artifacts present, git HEAD + origin remote observed |
| `partial` | Path exists but missing remotes and/or expected artifacts |
| `missing` | Declared path not found |

Partial sibling discovery does **not** block runtime surface hardening. Adapter contracts for those siblings simply do not pass.

## Canonical lineage

When `project-infi` is observed, hardening inherits a **canonical lineage snapshot** (maturity / receipt hash if present). That observation does **not** automatically raise AAES-OS-clone maturity claims.

## Families in scope (v0.1)

| Family | Declared siblings |
| --- | --- |
| AAES / Project Infinity | `aaes-os`, `project-infi`, `Project-Infinity-main` |
| Mythar | `mythar-core`, `mythar-api`, `mythar-registry`, `mythar-v0.2` (adapters deferred) |
| Nova | `nova-clone`, `nova-mission-002` |
| ULX / Research / AI Factory | `ulx`, `research-os`, `ai_factory` |
| Earth / SRE / CIH / Standards | `Earth-OS`, `sovereign-reconstruction-engine`, `CIH`, `ceip-temporal-standards` |
| Orchestration / adjacent | `MultiAgentOrchestrator`, `HYDRA`, `fae` |

## Promotion (step 5 live grants)

See [FEDERATION_LADDER.md](./FEDERATION_LADDER.md). Requires tested transport + indexed valid handshake receipts + lineage grant/revocation events.

## Related

- [Federation Ladder](./FEDERATION_LADDER.md)
- [External Integration Evidence](../external-integrations/README.md)
- [Production Hardening Evidence](../production-hardening/README.md)
- [Production Readiness Gate](../production-readiness-gate.md)
- [CCR Production Candidate Evidence](../../governance/ccr-aaes-os-production-candidate-evidence.md)
- [CCR Sibling Adapter Contracts](../../governance/ccr-aaes-os-sibling-adapter-contracts.md)
- [CCR Runtime Federation](../../governance/ccr-aaes-os-runtime-federation.md)
- [Drive-G note](../../scorecards/driveg-note.md)
