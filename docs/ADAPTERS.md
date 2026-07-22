# Gateway adapters

Setup installs `adapters.json` with every external route disabled. Enable only
the routes you use.

## Command adapters

Command adapters execute an already installed and already authenticated AI CLI.
TATWO passes the prompt by standard input or a `{prompt}` argument placeholder.
Only a minimal environment is inherited, and the process starts in an empty
adapter workspace. TATWO does not parse provider credential or session files.
Set `inheritHome: true` only when an already authenticated provider CLI requires
its normal HOME. This is an explicit trust decision because the provider CLI
then receives its normal user configuration.

Built-in examples are provided for Codex, Claude, and Grok. Commands can change
between vendor versions, so run `tatwo-ultrawork-beta doctor` after upgrades.

## OpenAI-compatible HTTP

HTTP adapters send a Responses-style request:

```json
{
  "model": "configured-model",
  "input": "bounded task"
}
```

Set `apiKeyEnv` to the name of an environment variable owned by the user. The
value is never written to TATWO state or receipts.

## Generic command adapter

Any text-in/text-out executable can be registered:

```json
{
  "id": "local-reviewer",
  "type": "command",
  "command": "my-ai-cli",
  "args": ["review", "{prompt}"],
  "promptTransport": "argument",
  "enabled": true
}
```
