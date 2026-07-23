# CCR-AAES-OS-SiblingAdapterContracts

Fail-closed **adapter contracts** for verified sibling remotes (connection ladder step 4).

Machine-readable spec: [`ccr/CCR-AAES-OS-SiblingAdapterContracts.spec.json`](./ccr/CCR-AAES-OS-SiblingAdapterContracts.spec.json).

## Condition

Each adapter is evaluated only when sibling discovery status is `verified`. Any missing remote match, required artifact, or required receipt field ⇒ **fail**.

## Current adapters (8 verified remotes)

| Adapter | Family | Sibling |
| --- | --- | --- |
| `adapter-project-infi-canonical` | project-infinity | project-infi |
| `adapter-nova-clone-shell` | nova | nova-clone |
| `adapter-earth-os` | earth-os | earth-os |
| `adapter-sre` | sre | sovereign-reconstruction-engine |
| `adapter-cih` | cih | cih |
| `adapter-ceip-temporal-standards` | standards | ceip-temporal-standards |
| `adapter-hydra` | hydra | hydra |
| `adapter-fae` | fae | fae |

**Mythar** remains `deferred-fail-closed` until discovery status is verified.

## Authority

Adapter evidence `aggregateHash`, with per-adapter receipts under `docs/release/sibling-repos/adapters/receipts/`.

## Constitutional guarantee

> Adapter contract pass requires verified sibling discovery, matching git remote, required artifacts, and any declared receipt fields. Fail closed on missing evidence. Pass does not authorize runtime federation.

## Commands

```bash
npm run siblings:adapters
npm run hardening:evidence
```

## Related

- [Sibling connection map](../release/sibling-repos/CONNECTION_MAP.md)
- [CCR Sibling Repo Discovery](./ccr-aaes-os-sibling-repo-discovery.md)
