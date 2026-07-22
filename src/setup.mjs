import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, now, safeJSON, stateRoot } from "./core/util.mjs";
import { runSmoke } from "./smoke.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = "0.1.0-beta.1";

function copyRuntime(source, destination) {
  fs.cpSync(source, destination, {
    recursive: true,
    force: false,
    dereference: false,
    filter: sourcePath => {
      const name = path.basename(sourcePath);
      return ![".git", "node_modules", ".tatwo-ultrawork-beta", "coverage", "dist"].includes(name);
    }
  });
}

function writeIfAbsent(file, content, mode = 0o600) {
  if (fs.existsSync(file)) throw new Error(`refusing_to_overwrite:${file}`);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, { mode });
}

function configureCodex(runtimeRoot, dryRun) {
  const config = path.join(os.homedir(), ".codex", "config.toml");
  const block = [
    "",
    "# TATWO_ULTRAWORK_BETA_MCP_BEGIN",
    "[mcp_servers.tatwo-ultrawork-beta]",
    'command = "node"',
    `args = [${JSON.stringify(path.join(runtimeRoot, "bin", "tatwo-ultrawork-beta-mcp.mjs"))}]`,
    "# TATWO_ULTRAWORK_BETA_MCP_END",
    ""
  ].join("\n");
  if (dryRun) return { target: "<codex-config>", action: "append_managed_block" };
  const existing = fs.existsSync(config) ? fs.readFileSync(config, "utf8") : "";
  if (existing.includes("TATWO_ULTRAWORK_BETA_MCP_BEGIN")) throw new Error("codex_config_already_managed");
  ensureDir(path.dirname(config));
  if (fs.existsSync(config)) fs.copyFileSync(config, `${config}.backup-${Date.now()}`);
  fs.appendFileSync(config, block, { mode: 0o600 });
  const skillTarget = path.join(os.homedir(), ".codex", "skills", "tatwo-ultrawork-beta");
  if (!fs.existsSync(skillTarget)) fs.cpSync(path.join(runtimeRoot, "skills", "tatwo-ultrawork-beta"), skillTarget, { recursive: true, force: false });
  return { target: "<codex-config>", action: "configured" };
}

function configureClaude(runtimeRoot, dryRun) {
  const config = path.join(os.homedir(), ".claude.json");
  if (dryRun) return { target: "<claude-config>", action: "merge_mcp_server" };
  const document = fs.existsSync(config) ? JSON.parse(fs.readFileSync(config, "utf8")) : {};
  document.mcpServers ||= {};
  if (document.mcpServers["tatwo-ultrawork-beta"]) throw new Error("claude_config_already_managed");
  document.mcpServers["tatwo-ultrawork-beta"] = {
    command: "node",
    args: [path.join(runtimeRoot, "bin", "tatwo-ultrawork-beta-mcp.mjs")]
  };
  if (fs.existsSync(config)) fs.copyFileSync(config, `${config}.backup-${Date.now()}`);
  fs.writeFileSync(config, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
  const skillTarget = path.join(os.homedir(), ".claude", "skills", "tatwo-ultrawork-beta");
  if (!fs.existsSync(skillTarget)) fs.cpSync(path.join(runtimeRoot, "skills", "tatwo-ultrawork-beta"), skillTarget, { recursive: true, force: false });
  return { target: "<claude-config>", action: "configured" };
}

export function setup(options = {}) {
  const dryRun = Boolean(options.dryRun);
  const root = stateRoot();
  const runtimeRoot = path.join(root, "runtime", version);
  const binRoot = process.platform === "win32" ? path.join(root, "bin") : path.join(os.homedir(), ".local", "bin");
  const localSkill = path.join(root, "skills", "tatwo-ultrawork-beta");
  const actions = [
    { target: "<tatwo-state>/runtime", action: "install_runtime" },
    { target: "<tatwo-state>/skills/tatwo-ultrawork-beta", action: "install_public_skill" },
    { target: "<user-bin>/tatwo-ultrawork-beta", action: "install_launcher" },
    { target: "<tatwo-state>/mcp-client-config.json", action: "write_generic_mcp_config" },
    { target: "<tatwo-state>/adapters.json", action: "install_disabled_adapter_registry" },
    { target: "<tatwo-state>/sandbox-policy.json", action: "install_restricted_sandbox_policy" }
  ];
  if (!dryRun) {
    if (!fs.existsSync(runtimeRoot)) {
      ensureDir(path.dirname(runtimeRoot));
      copyRuntime(packageRoot, runtimeRoot);
    }
    if (!fs.existsSync(localSkill)) {
      ensureDir(path.dirname(localSkill));
      fs.cpSync(path.join(runtimeRoot, "skills", "tatwo-ultrawork-beta"), localSkill, { recursive: true, force: false });
    }
    ensureDir(binRoot);
    const launcher = process.platform === "win32"
      ? path.join(binRoot, "tatwo-ultrawork-beta.cmd")
      : path.join(binRoot, "tatwo-ultrawork-beta");
    if (!fs.existsSync(launcher)) {
      const content = process.platform === "win32"
        ? `@echo off\r\nnode "${path.join(runtimeRoot, "bin", "tatwo-ultrawork-beta.mjs")}" %*\r\n`
        : `#!/usr/bin/env sh\nexec node ${JSON.stringify(path.join(runtimeRoot, "bin", "tatwo-ultrawork-beta.mjs"))} "$@"\n`;
      writeIfAbsent(launcher, content, 0o755);
    }
    const genericConfig = path.join(root, "mcp-client-config.json");
    if (!fs.existsSync(genericConfig)) {
      fs.writeFileSync(genericConfig, `${JSON.stringify({
        mcpServers: {
          "tatwo-ultrawork-beta": {
            command: "node",
            args: [path.join(runtimeRoot, "bin", "tatwo-ultrawork-beta-mcp.mjs")]
          }
        }
      }, null, 2)}\n`, { mode: 0o600 });
    }
    const adapterConfig = path.join(root, "adapters.json");
    if (!fs.existsSync(adapterConfig)) {
      fs.copyFileSync(path.join(runtimeRoot, "config", "adapters.example.json"), adapterConfig);
      fs.chmodSync(adapterConfig, 0o600);
    }
    const sandboxConfig = path.join(root, "sandbox-policy.json");
    if (!fs.existsSync(sandboxConfig)) {
      fs.copyFileSync(path.join(runtimeRoot, "config", "sandbox-policy.json"), sandboxConfig);
      fs.chmodSync(sandboxConfig, 0o600);
    }
  }
  if (options.configureCodex) actions.push(configureCodex(runtimeRoot, dryRun));
  if (options.configureClaude) actions.push(configureClaude(runtimeRoot, dryRun));
  const postInstallSmoke = dryRun ? { passed: null, status: "not_run_in_dry_run" } : runSmoke(root);
  return safeJSON({
    schema: "TatwoSetupReceiptV1",
    version,
    dryRun,
    actions,
    postInstallSmoke,
    installedAt: dryRun ? null : now(),
    hostConfigPolicy: "opt_in_only",
    pathHint: process.platform === "win32" ? "<tatwo-state>/bin" : "~/.local/bin"
  });
}
