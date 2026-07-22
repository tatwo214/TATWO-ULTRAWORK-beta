# Architecture

```text
AI client or CLI
      │
      ▼
TATWO public Skill and OS constitution
      │
      ▼
Goal / Context / Plan / Loops contract store
      │
      ├── provider-neutral Gateway adapters
      ├── stdio MCP server
      └── restricted Docker sandbox
              │
              ▼
        receipts and Goal Judge
```

The OS owns governance. Adapters own transport. Provider authentication remains
outside TATWO. The sandbox owns the execution boundary. Receipts carry evidence
between identities and engines.

State is local JSON under the TATWO beta state directory. Set
`TATWO_BETA_STATE_DIR` to select a different isolated state root.

## Hash binding

- Goal content produces `goalHash`.
- Context evidence produces `contextHash`.
- Plan content produces `planHash`.
- Loop tasks carry `goalHash + planHash`.
- A new Goal revision stales the prior Plan and Loops.

## Public boundary

There is no graphical application code, device service, update service, remote
control endpoint, hosted gateway, or provider credential store in this
repository.
