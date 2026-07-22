import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function canonicalJSON(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hash(value) {
  return crypto.createHash("sha256").update(canonicalJSON(value)).digest("hex");
}

export function id(prefix, value) {
  return `${prefix}_${hash(value).slice(0, 16)}`;
}

export function now() {
  return new Date().toISOString();
}

export function stateRoot() {
  const configured = String(process.env.TATWO_BETA_STATE_DIR ?? "").trim();
  return path.resolve(configured || path.join(os.homedir(), ".tatwo-ultrawork-beta"));
}

export function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

export function redact(value) {
  const unixUserRoot = new RegExp(`/${"Users"}/[^\\s"'\\x60]+`, "g");
  const unixVolumeRoot = new RegExp(`/${"Volumes"}/[^\\s"'\\x60]+`, "g");
  return String(value ?? "")
    .replace(unixUserRoot, "<local-path>")
    .replace(unixVolumeRoot, "<local-path>")
    .replace(/[A-Z]:\\Users\\[^\s"'`]+/gi, "<local-path>")
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "<secret>")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{10,}/gi, "Bearer <secret>")
    .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|password)\s*[:=]\s*[^\s"',}]+/gi, "$1=<secret>");
}

export function safeJSON(value) {
  return JSON.parse(redact(JSON.stringify(value)));
}

export function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_must_be_object`);
  }
  return value;
}

export function requireString(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label}_required`);
  return text;
}

export function uniqueStrings(values = []) {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}
