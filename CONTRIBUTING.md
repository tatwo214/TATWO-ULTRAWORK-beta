# Contributing

1. Read `OS.md`.
2. Define the Goal criteria and protected surfaces.
3. Keep changes provider-neutral and independent of any graphical application.
4. Add tests for contract gates, adapter behavior, or sandbox boundaries.
5. Run:

```bash
npm run verify
```

6. Confirm the public safety scan has zero findings.

Do not submit real credentials, private paths, machine state, proprietary
receipts, vendor sessions, or private-project fixtures.

New adapters must:

- use explicit configuration;
- avoid provider credential discovery;
- inherit only the minimum environment;
- redact errors and receipts;
- remain subordinate to the active OS contract.
