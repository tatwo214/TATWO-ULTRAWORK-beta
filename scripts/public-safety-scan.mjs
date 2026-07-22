#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const excluded = new Set([".git", "node_modules", "coverage", "dist"]);
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.isFile()) files.push(target);
  }
}

walk(root);

const forbidden = [
  { label: "macOS user path", pattern: new RegExp(`/${"Users"}/`) },
  { label: "mounted volume path", pattern: new RegExp(`/${"Volumes"}/`) },
  { label: "Windows user path", pattern: /[A-Z]:\\Users\\/i },
  { label: "private email", pattern: /[A-Z0-9._%+-]+@(?!users\.noreply\.github\.com)[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "access token", pattern: /\b(?:gh[opsu]_|sk-)[A-Za-z0-9_-]{16,}/ },
  { label: "private OS repository", pattern: new RegExp(["TATWO", "ULTRAWORKos"].join("-")) },
  { label: "application source", pattern: new RegExp(`\\b(?:${["Swift", "UI"].join("")}|${["Launch", "Agent"].join("")}|${["Spark", "le"].join("")}|${["Bundle", "ID"].join(" ")})\\b`, "i") },
  { label: "private model route", pattern: new RegExp(`\\b(?:${["fable", "5"].join("-")}|${["sonnet", "5"].join("-")}|${["gpt", "5.5"].join("-").replace(".", "\\.")})\\b`, "i") }
];

const findings = [];
for (const file of files) {
  const relative = path.relative(root, file);
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(text)) findings.push({ file: relative, rule: rule.label });
  }
}

if (findings.length) {
  process.stderr.write(`${JSON.stringify({ ok: false, findings }, null, 2)}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ ok: true, filesScanned: files.length, findings: 0 }, null, 2)}\n`);
