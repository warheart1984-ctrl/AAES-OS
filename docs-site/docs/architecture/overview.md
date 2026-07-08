# Architecture Overview

AAES-OS is structured as a monorepo of governed runtime packages. For the current filing index and legacy architecture notes, see [docs/architecture/README.md](../../../docs/architecture/README.md).

```
packages/
├── governed-runtime/     # Universal coding adapter layer
├── coding-assistant/     # Nova + Infinity + sandbox facade
├── aaes-governance/      # PatternLedger, InvariantEngine, proof surfaces
├── ucr-runtime/          # Governed UCR execution path
├── runledger/            # Run/span ledger and invariant links
├── trace-bus/            # Trace event bus
├── evidence-receipts/    # Receipt store for evidence layers
└── ...
```

## Design Principles

1. **Governed by default** — every action carries identity, trace, and policy context.
2. **Vendor-agnostic** — backends plug in via `CodingBackend`.
3. **Auditable** — Pattern Ledger records recurring fault patterns.
4. **Composable** — Nova shell, Infinity agent, and sandbox are independent modules.

## Data Flow

```
User Input → CodingRouter → Policy Match → Backend Adapter → Governed Response
                    ↓
              Pattern Ledger
```
