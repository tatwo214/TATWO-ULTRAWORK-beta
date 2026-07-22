import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runSmoke } from "../src/smoke.mjs";

test("synthetic collaboration smoke closes the Goal without external providers", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tatwo-beta-smoke-"));
  const receipt = runSmoke(root);
  assert.equal(receipt.passed, true);
  assert.deepEqual(receipt.checks, {
    goalContextPlanLoopJudge: true,
    privacyBoundary: true,
    unsafeCommandRejected: true
  });
});
