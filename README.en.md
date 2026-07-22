# TATWO-ULTRAWORK beta

[中文](README.md) · [Public OS Constitution](OS.md) · [Security](SECURITY.md)

**Coordinate multiple AI engines under one Goal, architecture map, Plan, Loop,
sandbox, and acceptance contract.**

TATWO-ULTRAWORK beta is a provider-neutral, local-first collaboration layer. It
is not another large agent runtime. It is the governance and gateway layer above
models, CLIs, and tools.

> The graphical TATWO OS App is under development and is not included in this
> public beta. This repository contains only the public OS rules, CLI, MCP,
> gateway, restricted sandbox, contracts, and Skill.

## 1. Product position and beta boundary

Included:

- Goal-first TATWO Work OS constitution.
- stdio MCP server and CLI.
- Codex, Claude, and Grok CLI adapter examples.
- OpenAI-compatible HTTP and generic command adapters.
- Restricted Docker sandbox.
- Public `$tatwo-ultrawork-beta` Skill.
- Goal, Context, Plan, Loop, alignment, and Goal Judge receipts.

Not included:

- Graphical OS App code.
- Device control, synchronization, update, or private infrastructure.
- Hosted gateway, account system, or secret storage.
- Private projects, receipts, paths, model evaluations, or machine state.

## 2. TATWO OS authority

```text
Goal Contract
→ Context / Architecture Discovery
→ Plan
→ Loops
→ Goal Judge
```

Core rules:

- Goal is the start and the acceptance boundary.
- Context precedes rules; architecture precedes solutions.
- `identity > model brand`.
- Plan explains how work reconnects to the original project.
- Loops bind to `goalHash + planHash` and stop on drift.
- AI inspects facts first and asks humans only for real preferences, authority,
  and material conflicts.
- Finished execution is not a passed Goal; every criterion needs evidence.

Read [OS.md](OS.md) for the complete public constitution.

## 3. Five-minute Quick Start

Requires Node.js 20 or newer. Docker is optional. Without Docker, the OS, MCP,
gateway text calls, and dry-run remain available.

Install from the pinned beta tag:

```bash
npx --yes github:tatwo214/TATWO-ULTRAWORK-beta#v0.1.0-beta.2 setup
```

Verify:

```bash
tatwo-ultrawork-beta doctor --json
tatwo-ultrawork-beta tools --json
tatwo-ultrawork-beta smoke --json
```

All external model adapters are disabled by default. Inspect `adapters.json` in
the local state directory, enable only a route that has completed independent
login and testing, then run doctor again.

Setup does not modify Codex or Claude configuration by default. Configuration is
explicit:

```bash
tatwo-ultrawork-beta setup --configure-codex
tatwo-ultrawork-beta setup --configure-claude
```

Source installation:

```bash
git clone https://github.com/tatwo214/TATWO-ULTRAWORK-beta.git
cd TATWO-ULTRAWORK-beta
npm test
node bin/tatwo-ultrawork-beta.mjs setup --dry-run --json
```

## 4. Platforms and providers

| Type | Integration |
|---|---|
| Codex | Authenticated Codex CLI command adapter |
| Claude | Authenticated Claude CLI command adapter |
| Grok | Authenticated Grok CLI command adapter |
| OpenAI-compatible | Responses-style HTTP adapter |
| Other AI | Text-in/text-out generic command adapter |

Adapters use PATH and explicit configuration only. They do not parse provider
credential, session, or browser profile files. An adapter that needs an existing
CLI login inherits HOME only after the user explicitly enables it with
`inheritHome: true`. Every dispatch starts in an empty isolated workspace, not
the current project. See
[docs/ADAPTERS.md](docs/ADAPTERS.md).

## 5. Security and sandbox

The sandbox:

- does not mount HOME, provider configuration, or the Docker socket;
- disables network access;
- never installs, starts, or pulls automatically;
- uses a read-only container root and drops Linux capabilities;
- allows only declared commands;
- rejects symlink escape, path escape, and secret-like files;
- fails closed when Docker is unavailable.

See [docs/SANDBOX.md](docs/SANDBOX.md).

## 6. MCP installation

Setup generates a generic MCP configuration:

```json
{
  "mcpServers": {
    "tatwo-ultrawork-beta": {
      "command": "node",
      "args": ["<installed-runtime>/bin/tatwo-ultrawork-beta-mcp.mjs"]
    }
  }
}
```

Codex and Claude configuration requires an explicit setup flag. Other MCP
clients can copy this entry and replace the runtime path.

## 7. First collaboration

Every MCP tool is also available through the CLI:

```bash
tatwo-ultrawork-beta call tatwo.os.begin --input '{
  "outcome": "Review a small change with two AI engines",
  "criteria": ["implementation test passes", "independent review passes"],
  "nonGoals": ["production deployment"],
  "constraints": ["sandbox only"],
  "projectPrinciples": ["small verified changes"],
  "architectureAnchors": ["existing public API remains stable"],
  "protectedSurfaces": ["credentials and production state"]
}' --json
```

Continue with:

1. `tatwo.context.submit`
2. `tatwo.goal.confirm`
3. `tatwo.plan.issue`
4. `tatwo.loops.dispatch`
5. `tatwo.gateway.fanout`
6. `tatwo.goal.alignment.submit`
7. `tatwo.goal.close`

Use `tatwo.os.next` for exactly one highest-impact next action or human question.

## 8. Architecture and adapter development

- [Architecture](docs/ARCHITECTURE.md)
- [Gateway adapters](docs/ADAPTERS.md)
- [Sandbox](docs/SANDBOX.md)
- [Public Skill](skills/tatwo-ultrawork-beta/SKILL.md)

## 9. Troubleshooting

Run `tatwo-ultrawork-beta doctor --json` after installing or upgrading an AI
CLI. A degraded Docker result means container execution is unavailable; it does
not mean the OS or gateway failed.

Operational Plans remain blocked until both the Goal confirmation and an
evidence-backed sufficient Context receipt exist.

## 10. Privacy, security, and license

- [Privacy](PRIVACY.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- Apache License 2.0: [LICENSE](LICENSE) and [NOTICE](NOTICE)

Never submit API keys, sessions, cookies, private paths, or real private-project
content in issues, receipts, adapter configuration, or examples.

## 11. OS App status

The graphical TATWO OS App remains under construction and UX validation, so it
is not part of this public beta. The public release focuses on validating the
Work OS principles, multi-model gateway, MCP collaboration, and restricted
sandbox.
