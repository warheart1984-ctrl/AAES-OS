# CCR-AAES-OS-RuntimeFederation

Defines the constitutional conditions under which **live sibling federation** is permitted.

## Identifier

| Field | Value |
| --- | --- |
| CCR ID | `CCR-AAES-OS-RuntimeFederation` |
| Spec | [`ccr/CCR-AAES-OS-RuntimeFederation.spec.json`](./ccr/CCR-AAES-OS-RuntimeFederation.spec.json) |
| Handshake contract | [`crc/CRC-AAES-OS-HandshakeReceipt.spec.json`](./crc/CRC-AAES-OS-HandshakeReceipt.spec.json) |
| Ladder | [`../release/sibling-repos/FEDERATION_LADDER.md`](../release/sibling-repos/FEDERATION_LADDER.md) |

## Checkout vs live authority

| Authority | Proven by | Permits |
| --- | --- | --- |
| **Checkout** | Verified adapter contracts (`CCR-AAES-OS-SiblingAdapterContracts`) | Reading, verifying, inheriting static artifacts |
| **Live mesh** | Valid handshake receipt (`CRC-AAES-OS-HandshakeReceipt`) under this CCR | Live sessions, remote calls, federated operations |

**Rule:** Passing adapter contracts does **not** imply live federation.

## Core invariants

1. **No live authority without receipt** — a sibling remote MUST NOT be treated as federated unless a valid handshake receipt exists and is attached to session lineage.
2. **Adapters are necessary but not sufficient** — verified adapters prove checkout authority only.
3. **Fail-closed by default** — missing verified adapter, Tested/Certified transport, or valid receipt ⇒ deny.
4. **Lineage-backed sessions** — every live session needs `sessionId`, lineage (adapter + transport + receipt), and a revocation path.

## Transport eligibility

| Maturity | Trials | Production |
| --- | --- | --- |
| Declared / Configured | deny | deny |
| Tested | allow (with receipt) | deny |
| Certified | allow | allow |

Promote Declared → Tested only via `npm run transports:test`.

## Decision states

| State | Meaning | Live session |
| --- | --- | --- |
| `NotEligible` | No verified adapter and/or transport not Tested/Certified | deny |
| `HandshakePending` | Verified adapter + eligible transport; receipt absent | deny |
| `FederationDenied` | Handshake failed or receipt invalid | deny |
| `FederationGranted` | Receipt valid | allow (attach receipt + lineage) |

## Commands

```bash
# Promote declared transports → Tested (writes transport test receipts)
npm run transports:test

# Evaluate federation decisions / refresh evidence indexes
npm run siblings:federation

# Full hardening attachment (includes runtime federation evidence)
npm run hardening:evidence
```

## Artifacts

| Artifact | Path |
| --- | --- |
| Transport registry | `docs/release/sibling-repos/federation/transport-descriptor-registry.json` |
| Transport test receipts | `docs/release/sibling-repos/federation/transport-test-receipts/*.json` |
| Receipt registry | `docs/release/sibling-repos/federation/handshake-receipt-registry.json` |
| Evidence index | `docs/release/sibling-repos/federation/handshake-receipt-evidence-index.json` |
| Session lineage | `docs/release/sibling-repos/federation/session-lineage-log.json` |
| Per-receipt files | `docs/release/sibling-repos/federation/receipts/*.json` |
| Decision / issuance | `tools/runtime-federation.ts` |
| Transport tests | `tools/transport-test.ts` |

## Implementation status (Drive-G-1)

`promotionConditionsMet(state)` (PromotionConditionValidator) returns Pass only when all four evidence layers hold:

1. **Indexed handshake receipts** — hash-valid receipts with linkage fields
2. **Active lineage** — live sessions with receipt/adapter/transport linkage (not Pending-only)
3. **Revocation paths** — Active sessions include `revocationEvent.path`, `authority`, and `condition`
4. **Transport maturity** — `tested=true` or `maturity=Certified`

Evidence index publishes `promotionChecklist` (`verdict`, per-layer Fail/Pass). Without issued Active grants: **`machinery-ready-live-grants-denied`**.

## Related

- [CRC Handshake Receipt](./crc-aaes-os-handshake-receipt.md)
- [CCR Sibling Adapter Contracts](./ccr-aaes-os-sibling-adapter-contracts.md)
- [Federation Ladder](../release/sibling-repos/FEDERATION_LADDER.md)
- [Connection Map](../release/sibling-repos/CONNECTION_MAP.md)
