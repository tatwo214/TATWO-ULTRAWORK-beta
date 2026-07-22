import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { dispatch, fanout } from "../src/adapters/dispatch.mjs";

test("generic command adapter dispatches without reading provider auth files", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tatwo-beta-adapter-"));
  const script = path.join(root, "mock.mjs");
  const registry = path.join(root, "adapters.json");
  fs.writeFileSync(script, "process.stdin.on('data', d => process.stdout.write('mock:' + d.toString()))");
  fs.writeFileSync(registry, JSON.stringify({
    schema: "AdapterRegistryV1",
    adapters: [{ id: "mock", type: "command", command: process.execPath, args: [script], promptTransport: "stdin", enabled: true }]
  }));
  process.env.TATWO_BETA_ADAPTERS_FILE = registry;
  process.env.TATWO_BETA_STATE_DIR = path.join(root, "state");
  const receipt = await dispatch({ adapterID: "mock", prompt: "hello" });
  assert.equal(receipt.output, "mock:hello");
  assert.equal(receipt.authority, "advisory");
  const batch = await fanout({ requests: [
    { adapterID: "mock", prompt: "one" },
    { adapterID: "mock", prompt: "two" }
  ] });
  assert.deepEqual(batch.results.map(result => result.ok), [true, true]);
  delete process.env.TATWO_BETA_ADAPTERS_FILE;
  delete process.env.TATWO_BETA_STATE_DIR;
});
