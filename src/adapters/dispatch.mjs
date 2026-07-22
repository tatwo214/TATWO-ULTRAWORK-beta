import { spawn } from "node:child_process";
import { getAdapter, listAdapters } from "./registry.mjs";
import path from "node:path";
import { ensureDir, id, now, redact, requireString, safeJSON, stateRoot } from "../core/util.mjs";

function runCommand(adapter, prompt, timeoutMs, dispatchID) {
  return new Promise((resolve, reject) => {
    const args = (adapter.args || []).map(value => String(value).replaceAll("{prompt}", prompt));
    const workspace = ensureDir(path.join(stateRoot(), "adapter-workspaces", dispatchID));
    const inheritedHome = adapter.inheritHome === true;
    const child = spawn(adapter.command, args, {
      env: {
        PATH: process.env.PATH,
        ...(inheritedHome ? { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE } : {}),
        LANG: process.env.LANG,
        LC_ALL: process.env.LC_ALL
      },
      cwd: workspace,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false
    });
    const stdout = [];
    const stderr = [];
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("adapter_timeout"));
    }, timeoutMs);
    child.stdout.on("data", chunk => stdout.push(chunk));
    child.stderr.on("data", chunk => stderr.push(chunk));
    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timer);
      const out = Buffer.concat(stdout).toString("utf8").trim();
      const err = Buffer.concat(stderr).toString("utf8").trim();
      if (code !== 0) reject(new Error(redact(err || `adapter_exit_${code}`)));
      else resolve(out);
    });
    if (adapter.promptTransport !== "argument") child.stdin.end(prompt);
    else child.stdin.end();
  });
}

async function runHTTP(adapter, prompt, model, timeoutMs) {
  const baseURL = requireString(adapter.baseURL, "baseURL").replace(/\/$/, "");
  const endpoint = adapter.endpoint || `${baseURL}/responses`;
  const apiKey = adapter.apiKeyEnv ? process.env[adapter.apiKeyEnv] : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ model: requireString(model, "model"), input: prompt }),
      signal: controller.signal
    });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { output_text: text }; }
    if (!response.ok) throw new Error(redact(body?.error?.message || `http_${response.status}`));
    const output = body.output_text ||
      body.choices?.map(choice => choice.message?.content ?? choice.text ?? "").join("") ||
      body.output?.flatMap(item => item.content || []).map(item => item.text || "").join("");
    if (!String(output ?? "").trim()) throw new Error("adapter_empty_output");
    return String(output).trim();
  } finally {
    clearTimeout(timer);
  }
}

export async function dispatch(input) {
  const adapterID = requireString(input.adapterID, "adapterID");
  const prompt = requireString(input.prompt, "prompt");
  const adapter = getAdapter(adapterID);
  const timeoutMs = Math.max(1000, Number(input.timeoutMs ?? 120000));
  const startedAt = now();
  const dispatchID = id("dispatch", { adapterID, startedAt, prompt });
  const output = adapter.type === "http"
    ? await runHTTP(adapter, prompt, input.model, timeoutMs)
    : await runCommand(adapter, prompt, timeoutMs, dispatchID);
  return safeJSON({
    schema: "GatewayDispatchReceiptV1",
    dispatchID,
    adapterID,
    model: input.model ? String(input.model) : null,
    authority: input.authority || "advisory",
    contractID: input.contractID ? String(input.contractID) : null,
    goalHash: input.goalHash ? String(input.goalHash) : null,
    planHash: input.planHash ? String(input.planHash) : null,
    loopID: input.loopID ? String(input.loopID) : null,
    output,
    startedAt,
    completedAt: now(),
    hostMutationAllowed: false
  });
}

export async function fanout(input) {
  const requests = Array.isArray(input.requests) ? input.requests : [];
  if (!requests.length) throw new Error("fanout_requests_required");
  const settled = await Promise.allSettled(requests.map(dispatch));
  return {
    schema: "GatewayFanoutReceiptV1",
    results: settled.map((result, index) => result.status === "fulfilled"
      ? { index, ok: true, receipt: result.value }
      : { index, ok: false, error: redact(result.reason?.message || result.reason) }),
    completedAt: now()
  };
}

export { listAdapters };
