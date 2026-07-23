# CCR-AAES-OS-SiblingRepoDiscovery

Constitutional Context Record for **sibling checkout discovery** and **canonical lineage inheritance**.

Machine-readable spec: [`ccr/CCR-AAES-OS-SiblingRepoDiscovery.spec.json`](./ccr/CCR-AAES-OS-SiblingRepoDiscovery.spec.json).

## Condition

Sibling evidence index exists with status `verified` or `partial`.

## Inherited fields

| Field | Source |
| --- | --- |
| `siblingAggregateHash` | sibling evidence `aggregateHash` |
| `siblingSummary` | verified / partial / missing counts |
| `canonicalLineage` | observed `project-infi` scorecard/receipt snapshot |

## Authority

Sibling evidence `aggregateHash`.

## Propagation

```text
Sibling evidence → Production hardening index → Scorecard / verification lineage
```

## Constitutional guarantee

> Cross-repo maturity language must inherit the latest sibling discovery evidence and must not claim live federation without adapter evidence.

## Connection ladder

1. Discovery registry  
2. Local evidence probe  
3. Canonical inheritance (`project-infi`)  
4. Adapter contracts *(planned)*  
5. Runtime federation *(planned)*  

## Truth boundary

Local presence and git remotes are **not** live federation.

## Related

- [Sibling connection map](../release/sibling-repos/CONNECTION_MAP.md)
- [CCR Production Candidate Evidence](./ccr-aaes-os-production-candidate-evidence.md)
