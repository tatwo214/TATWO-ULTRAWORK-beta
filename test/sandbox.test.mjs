import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { StateStore } from "../src/core/store.mjs";
import { Sandbox } from "../src/sandbox/sandbox.mjs";

test("sandbox copies a restricted snapshot and refuses unapproved commands", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tatwo-beta-sandbox-"));
  const source = path.join(root, "source");
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, "safe.txt"), "safe");
  fs.writeFileSync(path.join(source, ".env"), "SECRET=not-copied");
  process.env.TATWO_BETA_STATE_DIR = path.join(root, "state");
  const sandbox = new Sandbox(new StateStore(process.env.TATWO_BETA_STATE_DIR));
  const receipt = sandbox.begin({ contractID: "contract_test", source });
  assert.equal(receipt.status, "ready");
  const stored = sandbox.store.load().sandboxes[receipt.sandboxID];
  assert.equal(fs.existsSync(path.join(stored.workspace, "safe.txt")), true);
  assert.equal(fs.existsSync(path.join(stored.workspace, ".env")), false);
  assert.throws(() => sandbox.run({ sandboxID: receipt.sandboxID, command: "cat safe.txt" }), /not_allowlisted/);
  assert.throws(() => sandbox.run({ sandboxID: receipt.sandboxID, command: "npm test && true" }), /not_allowlisted/);
  delete process.env.TATWO_BETA_STATE_DIR;
});

test("sandbox rejects source symlinks", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tatwo-beta-symlink-"));
  const source = path.join(root, "source");
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(root, "outside.txt"), "outside");
  try {
    fs.symlinkSync(path.join(root, "outside.txt"), path.join(source, "escape"));
  } catch (error) {
    if (error.code === "EPERM") {
      t.skip("platform does not permit symlink creation in this environment");
      return;
    }
    throw error;
  }
  process.env.TATWO_BETA_STATE_DIR = path.join(root, "state");
  const sandbox = new Sandbox(new StateStore(process.env.TATWO_BETA_STATE_DIR));
  assert.throws(() => sandbox.begin({ contractID: "contract_test", source }), /symlink_rejected/);
  delete process.env.TATWO_BETA_STATE_DIR;
});

test("sandbox executes in Docker without writing back to the source", {
  skip: process.env.TATWO_TEST_DOCKER !== "1"
}, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tatwo-beta-docker-"));
  const source = path.join(root, "source");
  fs.mkdirSync(path.join(source, "test"), { recursive: true });
  fs.writeFileSync(path.join(source, "package.json"), JSON.stringify({
    type: "module",
    scripts: { test: "node --test" }
  }));
  fs.writeFileSync(path.join(source, "test", "write.test.mjs"), [
    "import fs from 'node:fs';",
    "import test from 'node:test';",
    "test('isolated write', () => fs.writeFileSync('sandbox-artifact.txt', 'sandbox-only'));"
  ].join("\n"));
  process.env.TATWO_BETA_STATE_DIR = path.join(root, "state");
  const sandbox = new Sandbox(new StateStore(process.env.TATWO_BETA_STATE_DIR));
  const begun = sandbox.begin({ contractID: "contract_test", source });
  const receipt = sandbox.run({ sandboxID: begun.sandboxID, command: "npm test" });
  assert.equal(receipt.status, "passed", JSON.stringify(receipt, null, 2));
  assert.equal(fs.existsSync(path.join(source, "sandbox-artifact.txt")), false);
  delete process.env.TATWO_BETA_STATE_DIR;
});
