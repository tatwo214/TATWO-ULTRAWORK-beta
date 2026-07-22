# Security policy

## Supported release

Security fixes are applied to the latest beta tag.

## Threat model

The public beta assumes AI output, project content, command adapters, and
external provider responses may be untrusted.

Default controls:

- Goal and Context gates before operational dispatch.
- Provider credentials remain outside TATWO state.
- Minimal environment inheritance for command adapters.
- Redaction before state, receipt, and error output.
- Docker execution with no network, dropped capabilities, read-only root, and
  no privilege escalation.
- No automatic runtime installation, startup, image pull, or unrestricted host
  fallback.
- Source symlink rejection and excluded secret-like files.
- Host client configuration only through explicit setup flags.

## Reporting

Use GitHub private vulnerability reporting when enabled. Do not open a public
issue containing credentials, exploit payloads against a real system, or
private-project data.

Include:

- affected version;
- minimal reproduction using synthetic data;
- expected and observed safety boundary;
- suggested mitigation if known.

## Non-goals

This project cannot make a third-party AI provider, CLI, container runtime, or
user-supplied command trustworthy. It provides bounded orchestration and
fail-closed defaults, not a guarantee against every compromise.
