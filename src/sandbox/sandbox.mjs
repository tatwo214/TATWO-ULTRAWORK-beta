import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { StateStore } from "../core/store.mjs";
import { ensureDir, id, now, redact, requireString, safeJSON, stateRoot } from "../core/util.mjs";

const defaultPolicy = {
  schema: "SandboxPolicyV1",
  runtime: "docker",
  image: "node:22-alpine",
  network: "none",
  autoInstall: false,
  autoStart: false,
  autoPull: false,
  hostWriteAllowed: false,
  maxFiles: 5000,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
  allowedCommands: ["node --test", "npm test", "npm run test", "npm run verify", "git diff --no-index", "true"],
  excludedNames: [".git", "node_modules", ".env", ".ssh", ".codex", ".claude", ".tatwo-ultrawork-beta"]
};

function hasCommand(command) {
  const finder = process.platform === "win32" ? "where" : "which";
  return spawnSync(finder, [command], { encoding: "utf8", timeout: 3000 }).status === 0;
}

function dockerServerAvailable() {
  if (!hasCommand("docker")) return false;
  return spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    timeout: 5000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE }
  }).status === 0;
}

function policy() {
  const file = process.env.TATWO_BETA_SANDBOX_POLICY || path.join(stateRoot(), "sandbox-policy.json");
  if (!fs.existsSync(file)) return defaultPolicy;
  return { ...defaultPolicy, ...JSON.parse(fs.readFileSync(path.resolve(file), "utf8")) };
}

function allowedCommand(command, activePolicy) {
  const normalized = String(command).trim();
  if (/[;&|`$><\n\r]/.test(normalized)) return false;
  return activePolicy.allowedCommands.includes(normalized);
}

function dockerIdentityArgs() {
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const gid = typeof process.getgid === "function" ? process.getgid() : null;
  if (!Number.isInteger(uid) || !Number.isInteger(gid)) return [];
  return ["--user", `${uid}:${gid}`];
}

function copySafeTree(source, destination, activePolicy) {
  const rootReal = fs.realpathSync(source);
  const excluded = new Set(activePolicy.excludedNames);
  const limits = {
    files: 0,
    bytes: 0,
    maxFiles: Number(activePolicy.maxFiles),
    maxFileBytes: Number(activePolicy.maxFileBytes),
    maxTotalBytes: Number(activePolicy.maxTotalBytes)
  };
  function visit(current, target) {
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("sandbox_source_symlink_rejected");
    const real = fs.realpathSync(current);
    if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) throw new Error("sandbox_source_escape_rejected");
    if (stat.isDirectory()) {
      ensureDir(target);
      for (const name of fs.readdirSync(current)) {
        if (excluded.has(name) || name.startsWith(".env.")) continue;
        visit(path.join(current, name), path.join(target, name));
      }
    } else if (stat.isFile()) {
      limits.files += 1;
      limits.bytes += stat.size;
      if (stat.size > limits.maxFileBytes) throw new Error("sandbox_source_file_too_large");
      if (limits.files > limits.maxFiles) throw new Error("sandbox_source_file_count_exceeded");
      if (limits.bytes > limits.maxTotalBytes) throw new Error("sandbox_source_total_size_exceeded");
      fs.copyFileSync(current, target);
    }
  }
  visit(source, destination);
}

export class Sandbox {
  constructor(store = new StateStore()) {
    this.store = store;
    this.root = ensureDir(path.join(store.root, "sandboxes"));
  }

  preflight() {
    const dockerInstalled = hasCommand("docker");
    return {
      schema: "SandboxPreflightV1",
      runtime: "docker",
      dockerInstalled,
      dockerServerAvailable: dockerServerAvailable(),
      executionAvailable: dockerInstalled && dockerServerAvailable(),
      fallback: "dry_run_and_text_only",
      autoInstall: false,
      autoStart: false,
      autoPull: false,
      hostWriteAllowed: false
    };
  }

  begin(input) {
    const contractID = requireString(input.contractID, "contractID");
    const source = path.resolve(requireString(input.source, "source"));
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error("sandbox_source_missing");
    const activePolicy = policy();
    const sandboxID = id("sandbox", { contractID, source: path.basename(source), createdAt: now() });
    const workspace = ensureDir(path.join(this.root, sandboxID, "workspace"));
    copySafeTree(source, workspace, activePolicy);
    const record = {
      schema: "SandboxReceiptV1",
      sandboxID,
      contractID,
      sourceLabel: path.basename(source),
      workspace,
      policy: activePolicy,
      status: "ready",
      createdAt: now(),
      commandReceipts: []
    };
    return this.store.update(state => {
      state.sandboxes[sandboxID] = record;
      return safeJSON({ ...record, workspace: "<isolated-workspace>" });
    });
  }

  run(input) {
    const sandboxID = requireString(input.sandboxID, "sandboxID");
    const command = requireString(input.command, "command");
    const activePolicy = policy();
    if (!allowedCommand(command, activePolicy)) throw new Error("sandbox_command_not_allowlisted");
    const state = this.store.load();
    const sandbox = state.sandboxes[sandboxID];
    if (!sandbox) throw new Error("sandbox_not_found");
    const preflight = this.preflight();
    if (!preflight.executionAvailable) {
      return { schema: "SandboxCommandReceiptV1", sandboxID, command, executed: false, status: "degraded", reason: "docker_unavailable" };
    }
    const imageCheck = spawnSync("docker", ["image", "inspect", activePolicy.image], { encoding: "utf8", timeout: 10000 });
    if (imageCheck.status !== 0) {
      return { schema: "SandboxCommandReceiptV1", sandboxID, command, executed: false, status: "blocked", reason: "image_not_present_and_auto_pull_disabled" };
    }
    const result = spawnSync("docker", [
      "run", "--rm", "--pull=never", "--network=none",
      "--pids-limit", "128", "--memory", "1g", "--cpus", "2",
      "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
      ...dockerIdentityArgs(),
      "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m,mode=1777",
      "--tmpfs", "/home/tatwo:rw,noexec,nosuid,size=64m,mode=1777",
      "--env", "HOME=/home/tatwo",
      "--env", "npm_config_cache=/tmp/npm-cache",
      "--volume", `${sandbox.workspace}:/workspace:rw`,
      "--workdir", "/workspace",
      activePolicy.image, "sh", "-lc", command
    ], {
      encoding: "utf8",
      timeout: Math.max(1000, Number(input.timeoutMs ?? 600000)),
      maxBuffer: 10 * 1024 * 1024,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE }
    });
    const receipt = safeJSON({
      schema: "SandboxCommandReceiptV1",
      sandboxID,
      command,
      executed: true,
      status: result.status === 0 ? "passed" : "failed",
      exitCode: result.status,
      stdout: redact(result.stdout || "").slice(-12000),
      stderr: redact(result.stderr || "").slice(-12000),
      completedAt: now()
    });
    this.store.update(next => {
      next.sandboxes[sandboxID].commandReceipts.push(receipt);
      next.sandboxes[sandboxID].status = receipt.status;
      return receipt;
    });
    return receipt;
  }

  receipt(input) {
    const sandboxID = requireString(input.sandboxID, "sandboxID");
    const sandbox = this.store.load().sandboxes[sandboxID];
    if (!sandbox) throw new Error("sandbox_not_found");
    return safeJSON({ ...sandbox, workspace: "<isolated-workspace>" });
  }
}
