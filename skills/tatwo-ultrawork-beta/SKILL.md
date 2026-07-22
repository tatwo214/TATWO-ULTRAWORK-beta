---
name: tatwo-ultrawork-beta
description: Public TATWO Work OS skill for Goal-first multi-model coordination through MCP, provider-neutral adapters, receipts, and a restricted sandbox.
---

# TATWO-ULTRAWORK beta

## Activation

Use this Skill when the user asks for TATWO beta, multi-model collaboration,
Goal / Plan / Loops coordination, bounded AI delegation, MCP dispatch, or
sandboxed verification.

At activation show:

1. **OS Active** — selected mode, context sufficiency, and mutation boundary.
2. **Goal** — outcome, criteria, non-goals, constraints, architecture anchors,
   and protected surfaces.
3. **Discovery** — current truth, relationships, unknowns, and conflicts.
4. **Plan** — discovery-only until Goal and Context are sufficient.
5. **Loops** — identity assignments bound to current hashes.
6. **Receipts** — evidence required by Goal Judge.

## Required sequence

```text
tatwo.os.begin
→ tatwo.context.submit
→ tatwo.goal.confirm
→ tatwo.plan.issue
→ tatwo.loops.dispatch
→ tatwo.goal.alignment.submit
→ tatwo.goal.close
```

Use `tatwo.os.next` to ask only the highest-impact unresolved question.
Discoverable facts must be inspected rather than asked again.

## Multi-model collaboration

- Use `tatwo.gateway.models` to inspect configured adapters.
- Use `tatwo.gateway.dispatch` for one bounded advisory or execution task.
- Use `tatwo.gateway.fanout` only for independent tasks.
- Models are replaceable bindings; identity and authority come from the active
  contract.
- Do not allow a worker to independently pass its own work.

## Sandbox

Run `tatwo.sandbox.preflight` first. If Docker isolation is unavailable, stay in
text-only or dry-run mode. Never downgrade to unrestricted host execution.

The sandbox rejects source symlinks, provider configuration, secret-like files,
unapproved commands, host HOME mounts, Docker socket mounts, automatic image
pulls, and network access.

## Conflict and drift

If a Loop conflicts with the Goal, architecture, project principles, protected
surfaces, or authority:

1. stop dependent execution;
2. mark the Loop diverged;
3. record the conflict;
4. ask the human for one material decision;
5. create a new Goal revision when the Goal changes.

## Public boundary

This Skill controls the public OS, MCP, gateway, and sandbox only. It does not
claim graphical application, device-control, updater, private runtime, or
credential-management capabilities.
