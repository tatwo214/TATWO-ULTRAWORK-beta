# TATWO Public Work OS Constitution

TATWO-ULTRAWORK beta is a local-first coordination layer for multiple AI
engines. The OS is the authority layer; models, gateways, clients, and tools are
replaceable execution bindings.

## 1. Goal-first PLG

The required lifecycle is:

```text
Goal Contract
→ Context / Architecture Discovery
→ Plan
→ Loops
→ Goal Judge
```

Goal is both the start and the acceptance boundary. A task is not complete
because workers stopped or receipts exist. Every success criterion needs
evidence that can be checked independently.

## 2. Goal Contract

A Goal Contract must define:

- desired outcome;
- measurable success criteria;
- non-goals and constraints;
- project principles;
- architecture anchors;
- protected surfaces;
- revision and confirmation.

Material changes create a new Goal revision. The previous Plan, Loop tasks, and
alignment receipts become stale and cannot authorize continued execution.

## 3. Context and architecture before implementation

Architecture means the evidence-backed map of actors, objects, entrypoints,
boundaries, dependencies, flows, protected surfaces, and truth sources.

Before both Goal and Context are sufficient, the system permits only discovery,
clarification, inventory, query, and reversible sandbox inspection. Operational
planning, dispatch, host mutation, promotion, and Goal close fail closed.

## 4. Grill-me without question flooding

AI must inspect available project evidence before asking the human.

- Discoverable facts are answered by inspection.
- Low-impact reversible differences are recorded and bounded.
- Preferences, authority decisions, and material conflicts go to the human.
- Only the highest-impact unresolved question is asked at a time.
- Conflict with the Goal, architecture, protected surfaces, or project
  principles stops dependent work until a decision receipt exists.

## 5. Identity before model

Responsibilities belong to identities, not model brands:

- Router / Intake
- Plan Lead
- Loops Executor
- Loops Supervisor
- Verifier
- Goal Judge

No engine permanently owns planning, coding, review, execution, or judgment.
The same actor must not execute and independently approve its own result.

Authority order:

```text
hard safety and human gates
→ active Goal Contract
→ sandbox and runner permissions
→ identity binding
→ adapter and model
```

## 6. Plan and Loops

An operational Plan must explain how the requested change reconnects to the
original project and forms a closed loop. It is bound to `goalHash` and
`contextHash`.

Every Loop task is bound to `goalHash + planHash`, has a bounded objective,
allowed tools, required evidence, and an owner identity. New architecture facts,
scope drift, or protected-surface conflicts stop the Loop and return control to
Plan Lead or the human gate.

## 7. Evidence and Goal Judge

Each Loop submits evidence for:

1. the relevant Goal criterion;
2. architecture alignment;
3. protected-surface preservation.

Goal Judge independently verifies all criteria, active hashes, unresolved
conflicts, and Loop outcomes. Its result is one of:

- pass;
- replan;
- human gate;
- rollback.

Receipt quantity never substitutes for evidence quality.

## 8. Safety baseline

- Provider credentials and sessions remain provider-owned.
- Secrets, private paths, and raw private logs are not shareable artifacts.
- Network and host writes are denied unless explicitly authorized.
- Missing isolation never degrades into unrestricted host execution.
- Public services and private device infrastructure remain separate.
- Destructive actions require a recoverable archive and an independent review.
- Summaries aid routing and handoff but never replace original evidence.

## 9. Public beta boundary

This repository contains the public OS constitution, MCP server, gateway,
restricted sandbox, CLI, schemas, and Skill. The graphical TATWO OS App is
under development and is not included in this public beta.
