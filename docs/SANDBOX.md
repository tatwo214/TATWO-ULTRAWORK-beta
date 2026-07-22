# Restricted sandbox

The public beta uses Docker as an optional execution boundary.

## Default restrictions

- no host HOME mount;
- no provider configuration or credential files;
- no Docker socket mount;
- no network;
- no added Linux capabilities;
- no privilege escalation;
- read-only container root;
- no automatic runtime installation, startup, or image pull;
- only allowlisted commands;
- source symlinks are rejected;
- excluded secret-like files are not copied.

The selected project is copied into an isolated workspace. Container writes
remain in that copy. Promotion back to the source project is outside the public
MCP tool surface and requires a separate human-authorized process.

If Docker is unavailable, sandbox execution reports `degraded` and the system
remains in dry-run or text-only mode.
