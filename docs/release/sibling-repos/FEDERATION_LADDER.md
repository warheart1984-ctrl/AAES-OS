# Federation Ladder

Evidence-first ladder for AAES-family sibling connectivity on Drive `G:\`.

:::info Drive-G-1
Each step asserts only what its artifacts prove. Do not treat a lower-step pass as authority for a higher step.
:::

## Ladder overview

| Step | Artifact / CCR | Role | Status |
| --- | --- | --- | --- |
| 1 — Discovery registry | `CCR-AAES-OS-SiblingRepoDiscovery` | Establish who exists (sibling repos, remotes) | ✅ |
| 2 — Local evidence probe | `tools/sibling-repo-evidence.ts` | Verify what is present (artifacts, hashes, origins) | ✅ |
| 3 — Canonical inheritance | `project-infi` lineage via inheritance helpers | Bind clones to canonical lineage (aggregate hash, maturity, receipts) | ✅ |
| 4 — Adapter contracts | `CCR-AAES-OS-SiblingAdapterContracts` | Define checkout-level use of each verified remote | ✅ |
| 5 — Runtime federation | `CCR-AAES-OS-RuntimeFederation` | Govern live mesh authority via handshake receipts + transports | planned (machinery ready; live grants denied until promotion) |

```text
Discovery → Local probe → Canonical inheritance → Adapter contracts → Runtime federation
   ✅            ✅                 ✅                    ✅              planned*
```

\* Step 5 ships fail-closed decision machinery, transport testing, issuance, and session lineage. Live grants require promotion conditions below.

## Step 4 snapshot (checkout authority)

- Fail-closed, receipt-backed adapter contracts
- Registry, evidence index, per-adapter receipts under `docs/release/sibling-repos/adapters/`
- **Checkout authority only** — does not grant live mesh sessions

## Step 5 — Runtime federation

| Piece | Path / ID |
| --- | --- |
| CCR | `CCR-AAES-OS-RuntimeFederation` |
| Handshake contract | `CRC-AAES-OS-HandshakeReceipt` |
| Decision / issuance | `tools/runtime-federation.ts` |
| Transport tests | `tools/transport-test.ts` (`npm run transports:test`) |
| Transport registry | `docs/release/sibling-repos/federation/transport-descriptor-registry.json` |
| Transport test receipts | `docs/release/sibling-repos/federation/transport-test-receipts/*.json` |
| Receipt registry | `docs/release/sibling-repos/federation/handshake-receipt-registry.json` |
| Evidence index | `docs/release/sibling-repos/federation/handshake-receipt-evidence-index.json` |
| Session lineage | `docs/release/sibling-repos/federation/session-lineage-log.json` |

### Transport maturity

`Declared` → `Configured` → `Tested` → `Certified`

| Maturity | `tested` | Federation use |
| --- | --- | --- |
| Declared / Configured | false | NotEligible |
| Tested | true | Internal trials only |
| Certified | true | Production sessions |

`opsConsole-SovereignX-v1` moves Declared → Tested **only** via `npm run transports:test` (writes a transport test receipt). This tool never auto-grants Certified.

### Key boundary

| Authority | Evidence | Allows |
| --- | --- | --- |
| Checkout | Verified adapters + static evidence | Read / verify / inherit artifacts |
| Live mesh | Valid handshake receipt under RuntimeFederation | Live sessions, remote calls, federated ops |

**Rule:** Passing adapter contracts does **not** imply live federation.

### Decision states

`NotEligible` → `HandshakePending` → `FederationDenied` | `FederationGranted`

Fail-closed default: deny unless verified adapter **and** Tested/Certified transport **and** valid receipt.

### Session lineage

Append-only `session-lineage-log.json` statuses: `Pending` | `Active` | `Revoked` | `Expired` | `Denied`. Each entry is hash-checked; log carries `aggregateHash`.

### Promotion conditions (HandshakePending → FederationGranted)

`promotionConditionsMet(state)` is a four-layer **PromotionConditionValidator**. All layers must Pass:

| Layer | Evidence | Fail message |
| --- | --- | --- |
| 1 | Indexed handshake receipts with valid hash + linkage (`receiptId`, `sessionId`, `adapterId`, `transportId`, …) | No indexed / no valid receipts |
| 2 | Active lineage (not Pending-only) with receipt/adapter/transport linkage | No lineage / no Active sessions |
| 3 | Active sessions carry `revocationEvent.path` + `authority` + `condition` | Active sessions lack revocation paths |
| 4 | ≥1 transport with `tested=true` or `maturity=Certified` | No tested or certified transports |

Motto expressed as code: **Evidence first. Verification always. Reality is the final authority.**

## Commands

```bash
npm run siblings:evidence
npm run siblings:adapters
npm run transports:test
npm run siblings:federation
npm run hardening:evidence
```

## Related

- [Connection Map](./CONNECTION_MAP.md)
- [CCR Runtime Federation](../../governance/ccr-aaes-os-runtime-federation.md)
- [CRC Handshake Receipt](../../governance/crc-aaes-os-handshake-receipt.md)
- [CCR Sibling Adapter Contracts](../../governance/ccr-aaes-os-sibling-adapter-contracts.md)
