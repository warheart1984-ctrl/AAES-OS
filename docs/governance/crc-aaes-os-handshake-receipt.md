# CRC-AAES-OS-HandshakeReceipt

Evidence artifact proving that a **live federation handshake** has occurred under declared adapter and transport conditions.

## Identifier

| Field | Value |
| --- | --- |
| Contract ID | `CRC-AAES-OS-HandshakeReceipt` |
| Spec | [`crc/CRC-AAES-OS-HandshakeReceipt.spec.json`](./crc/CRC-AAES-OS-HandshakeReceipt.spec.json) |
| Governing CCR | `CCR-AAES-OS-RuntimeFederation` |

## Required fields

| Field | Role |
| --- | --- |
| `receiptId` | Globally unique receipt id |
| `sessionId` | Live session this receipt authorizes |
| `remoteId` | Sibling remote identity |
| `adapterId` | Must reference a **verified** adapter |
| `transportId` | Must reference a **Tested** (trial) or **Certified** (production) transport |
| `receiptHash` | `sha256:` of canonical payload **without** `receiptHash` |
| `constitutionalMaturity` | Compatible with remote project-infi lineage when observed |
| `capabilitiesGranted` | Session capability allow-list |
| `issuedAt` / `expiresAt` | Validity window |
| `issuer` | Issuing authority identity |
| `revocationPath` | Non-empty revocation mechanism |

## Issuance

### Pre-conditions (fail-closed)

1. **Adapter** — `AdapterContracts[remoteId]` exists and is verified.
2. **Transport** — `transportId` exists and is **Tested** (internal trials) or **Certified** (production).
3. **Handshake** — protocol-level exchange succeeded (no auth/integrity failures).
4. **Maturity** — `constitutionalMaturity` compatible with remote lineage when observed.

Any missing/invalid pre-condition ⇒ **no receipt**; lineage records `Denied`; federation stays `HandshakePending` / `FederationDenied` / `NotEligible`.

### Action (`issueHandshakeReceipt`)

```text
issueHandshakeReceipt(remoteId, adapterId, transportId, capabilities)
  → validate pre-conditions
  → construct receipt payload
  → compute receiptHash
  → store under federation/receipts/ + handshake-receipt-registry.json
  → upsert session lineage to Active
  → return { receiptId, sessionId }
```

Implemented in `tools/runtime-federation.ts`.

### Pipeline wiring

| Step | Effect |
| --- | --- |
| Validate adapter / transport / handshake / maturity | Deny issuance if any fail |
| Build payload | Includes revocationPath, issuedAt/expiresAt, issuer |
| Hash | `receiptHash = sha256(canonical payload without receiptHash)` |
| Store | Per-receipt JSON + registry + evidence index (via federation build) |
| Lineage | `Pending` on request path; `Active` on successful issuance |

## Constraints (fail-closed)

- Adapter linkage to verified adapter registry/evidence
- Transport linkage to **eligible** transport (`tested=true`, maturity Tested or Certified)
- Maturity consistency with remote lineage when observed
- Hash integrity of serialized payload
- Current time within `[issuedAt, expiresAt]`
- Non-empty `revocationPath`

## Storage

| Store | Path |
| --- | --- |
| Registry | `docs/release/sibling-repos/federation/handshake-receipt-registry.json` |
| Evidence index | `docs/release/sibling-repos/federation/handshake-receipt-evidence-index.json` |
| Receipts | `docs/release/sibling-repos/federation/receipts/*.json` |
| Session lineage | `docs/release/sibling-repos/federation/session-lineage-log.json` |

## Truth boundary

A handshake receipt proves a specific live session handshake under declared conditions. It does **not** permanently federate a remote beyond the receipt validity window, and empty receipt storage means **no** live grants exist.
