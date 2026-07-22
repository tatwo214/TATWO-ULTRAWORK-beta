import assert from "node:assert/strict";
import test from "node:test";
import { setup } from "../src/setup.mjs";

test("setup dry-run is non-mutating and host configuration is opt-in", () => {
  const receipt = setup({ dryRun: true });
  assert.equal(receipt.dryRun, true);
  assert.equal(receipt.hostConfigPolicy, "opt_in_only");
  assert.ok(receipt.actions.some(action => action.action === "install_public_skill"));
  assert.ok(!receipt.actions.some(action => action.action === "configured"));
  assert.equal(receipt.postInstallSmoke.status, "not_run_in_dry_run");
});
