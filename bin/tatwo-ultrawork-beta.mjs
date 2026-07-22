#!/usr/bin/env node
import fs from "node:fs";
import { callTool, toolDefinitions } from "../src/mcp/tools.mjs";
import { setup } from "../src/setup.mjs";
import { redact, safeJSON } from "../src/core/util.mjs";

function parse(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    options[key] = next && !next.startsWith("--") ? argv[++index] : true;
  }
  return { positional, options };
}

function inputFrom(options) {
  if (options.file) return JSON.parse(fs.readFileSync(String(options.file), "utf8"));
  if (options.input) return JSON.parse(String(options.input));
  return {};
}

function output(value, json = false) {
  if (json || typeof value !== "string") process.stdout.write(`${JSON.stringify(safeJSON(value), null, 2)}\n`);
  else process.stdout.write(`${redact(value)}\n`);
}

function help() {
  output(`TATWO-ULTRAWORK beta

Usage:
  tatwo-ultrawork-beta setup [--dry-run] [--configure-codex] [--configure-claude] [--json]
  tatwo-ultrawork-beta doctor [--json]
  tatwo-ultrawork-beta smoke [--json]
  tatwo-ultrawork-beta tools [--json]
  tatwo-ultrawork-beta call <tool> --input '<json>' [--json]
  tatwo-ultrawork-beta call <tool> --file request.json [--json]
  tatwo-ultrawork-beta mcp

The public beta never reads provider auth files and never enables unrestricted host execution.`);
}

const { positional, options } = parse(process.argv.slice(2));
const command = positional[0];

try {
  if (!command || ["help", "-h", "--help"].includes(command)) {
    help();
  } else if (command === "setup") {
    output(setup({
      dryRun: Boolean(options["dry-run"]),
      configureCodex: Boolean(options["configure-codex"]),
      configureClaude: Boolean(options["configure-claude"])
    }), Boolean(options.json));
  } else if (command === "doctor") {
    output(await callTool("tatwo.doctor", {}), Boolean(options.json));
  } else if (command === "smoke") {
    const { runSmoke } = await import("../src/smoke.mjs");
    output(runSmoke(), Boolean(options.json));
  } else if (command === "tools") {
    output({ schema: "TatwoToolListV1", tools: toolDefinitions }, Boolean(options.json));
  } else if (command === "call") {
    const tool = positional[1];
    if (!tool) throw new Error("tool_name_required");
    output(await callTool(tool, inputFrom(options)), Boolean(options.json));
  } else if (command === "mcp") {
    const { MCPServer } = await import("../src/mcp/server.mjs");
    new MCPServer().start();
  } else {
    throw new Error("unknown_command");
  }
} catch (error) {
  output({ ok: false, error: redact(error?.message || error) }, true);
  process.exitCode = 1;
}
