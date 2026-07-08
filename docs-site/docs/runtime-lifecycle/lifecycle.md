# Runtime Lifecycle

AAES-OS runtime lifecycle follows a governed boot -> execute -> trace -> audit cycle.

## Phases

1. **Boot** - load policies, initialize Pattern Ledger, register backends
2. **Execute** - route requests through CodingRouter with governance context
3. **Trace** - annotate responses with policy IDs and trace metadata
4. **Audit** - ingest faults into Pattern Ledger, compute drift metrics

## Packages Involved

- `@aaes-os/governed-runtime` - routing and execution
- `@aaes-os/aaes-governance` - fault and pattern tracking
- `@aaes-os/runledger` - run/span ledger
- `@aaes-os/ucr-runtime` - governed UCR execution path
