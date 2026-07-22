import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { requireString, safeJSON, stateRoot } from "../core/util.mjs";

const builtins = [
  { id: "codex", type: "command", command: "codex", args: ["exec", "--skip-git-repo-check", "-"], promptTransport: "stdin", inheritHome: true, enabled: false },
  { id: "claude", type: "command", command: "claude", args: ["-p", "{prompt}"], promptTransport: "argument", inheritHome: true, enabled: false },
  { id: "grok", type: "command", command: "grok", args: ["-p", "{prompt}"], promptTransport: "argument", inheritHome: true, enabled: false }
];

function executableExists(command) {
  const finder = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(finder, [command], { encoding: "utf8", timeout: 3000 });
  return result.status === 0;
}

export function registryPath() {
  return path.resolve(process.env.TATWO_BETA_ADAPTERS_FILE || path.join(stateRoot(), "adapters.json"));
}

export function loadRegistry() {
  const file = registryPath();
  if (!fs.existsSync(file)) return { schema: "AdapterRegistryV1", adapters: builtins };
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(parsed.adapters)) throw new Error("adapter_registry_invalid");
  return parsed;
}

export function listAdapters() {
  return loadRegistry().adapters.map(adapter => safeJSON({
    id: adapter.id,
    type: adapter.type,
    enabled: adapter.enabled === true,
    available: adapter.type === "command" ? executableExists(adapter.command) : Boolean(adapter.baseURL),
    command: adapter.type === "command" ? adapter.command : undefined,
    baseURL: adapter.type === "http" ? adapter.baseURL : undefined,
    apiKeyEnv: adapter.type === "http" ? adapter.apiKeyEnv : undefined
  }));
}

export function getAdapter(adapterID) {
  const wanted = requireString(adapterID, "adapterID");
  const adapter = loadRegistry().adapters.find(candidate => candidate.id === wanted);
  if (!adapter || adapter.enabled !== true) throw new Error("adapter_not_found_or_disabled");
  return adapter;
}

export { executableExists };
