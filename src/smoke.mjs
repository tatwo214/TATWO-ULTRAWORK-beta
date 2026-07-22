import fs from "node:fs";
import path from "node:path";
import { StateStore } from "./core/store.mjs";
import { TatwoOS } from "./core/os.mjs";
import { Sandbox } from "./sandbox/sandbox.mjs";
import { id, now, redact, stateRoot } from "./core/util.mjs";

export function runSmoke(root = stateRoot()) {
  const runID = id("smoke", { startedAt: now() });
  const runRoot = path.join(root, "smoke", runID);
  const store = new StateStore(path.join(runRoot, "state"));
  const osLayer = new TatwoOS(store);
  const goal = osLayer.begin({
    outcome: "Complete the synthetic public beta collaboration smoke",
    criteria: ["mock loop passes", "privacy boundary passes"],
    nonGoals: ["external provider call", "host deployment"],
    constraints: ["synthetic data only"],
    projectPrinciples: ["goal first"],
    architectureAnchors: ["OS remains above adapters"],
    protectedSurfaces: ["credentials and source project"]
  });
  osLayer.submitContext({
    contractID: goal.contractID,
    currentTruth: ["synthetic smoke fixture"],
    boundaries: ["no external provider", "no source writeback"],
    evidence: ["local deterministic fixture"],
    sufficiency: "sufficient"
  });
  osLayer.confirm({ contractID: goal.contractID, confirmedBy: "installer-smoke" });
  const plan = osLayer.issuePlan({
    contractID: goal.contractID,
    integrationClosure: "Validate the public OS lifecycle and restricted snapshot boundary",
    steps: ["issue bounded loop", "submit evidence", "run Goal Judge"],
    protectedSurfaces: ["credentials and source project"],
    verification: ["mock loop passes", "privacy boundary passes"]
  });
  const loop = osLayer.dispatchLoop({
    contractID: goal.contractID,
    planHash: plan.planHash,
    title: "Synthetic verifier loop",
    objective: "Verify contract and privacy behavior"
  });

  const fixture = path.join(runRoot, "fixture");
  fs.mkdirSync(fixture, { recursive: true });
  fs.writeFileSync(path.join(fixture, "safe.txt"), "synthetic");
  fs.writeFileSync(path.join(fixture, ".env"), "SYNTHETIC_SECRET=must-not-copy");
  const sandbox = new Sandbox(store);
  const sandboxReceipt = sandbox.begin({ contractID: goal.contractID, source: fixture });
  const storedSandbox = store.load().sandboxes[sandboxReceipt.sandboxID];
  const privacyBoundaryPassed =
    fs.existsSync(path.join(storedSandbox.workspace, "safe.txt")) &&
    !fs.existsSync(path.join(storedSandbox.workspace, ".env")) &&
    redact(`sk-${"syntheticsecretvalue"}`).includes("<secret>");
  let unsafeCommandRejected = false;
  try {
    sandbox.run({ sandboxID: sandboxReceipt.sandboxID, command: "printenv" });
  } catch (error) {
    unsafeCommandRejected = String(error.message).includes("not_allowlisted");
  }
  if (!privacyBoundaryPassed || !unsafeCommandRejected) throw new Error("smoke_privacy_boundary_failed");

  osLayer.submitAlignment({
    loopID: loop.loopID,
    status: "aligned",
    criterionEvidence: ["mock loop passes", "privacy boundary passes"],
    architectureEvidence: ["OS contract remained authoritative"],
    protectedSurfaceEvidence: ["credential-like fixture was excluded and source was unchanged"]
    ,
    submittedBy: "synthetic-loops-executor"
  });
  const judge = osLayer.close({
    contractID: goal.contractID,
    criterionEvidence: ["mock loop passes: deterministic flow", "privacy boundary passes: restricted snapshot"],
    judgedBy: "synthetic-goal-judge"
  });
  if (!judge.passed) throw new Error("smoke_goal_judge_failed");
  return {
    schema: "TatwoSmokeReceiptV1",
    runID,
    passed: true,
    checks: {
      goalContextPlanLoopJudge: true,
      privacyBoundary: privacyBoundaryPassed,
      unsafeCommandRejected
    },
    completedAt: now()
  };
}
