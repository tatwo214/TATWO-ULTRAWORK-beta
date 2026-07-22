import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { StateStore } from "../src/core/store.mjs";
import { TatwoOS } from "../src/core/os.mjs";

function harness() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tatwo-beta-os-"));
  return new TatwoOS(new StateStore(root));
}

function goalInput(overrides = {}) {
  return {
    outcome: "Ship a provider-neutral collaboration example",
    criteria: ["mock collaboration passes", "privacy scan passes"],
    nonGoals: ["host deployment"],
    constraints: ["no unrestricted host writes"],
    projectPrinciples: ["goal first"],
    architectureAnchors: ["OS above adapters"],
    protectedSurfaces: ["provider credentials"],
    ...overrides
  };
}

test("Goal and Context gates block operational plans until sufficient", () => {
  const osLayer = harness();
  const goal = osLayer.begin(goalInput());
  assert.throws(() => osLayer.issuePlan({
    contractID: goal.contractID,
    integrationClosure: "Connect through public MCP",
    steps: ["implement"],
    verification: ["test"]
  }), /goal_insufficient/);

  osLayer.confirm({ contractID: goal.contractID, confirmedBy: "test-human" });
  assert.throws(() => osLayer.issuePlan({
    contractID: goal.contractID,
    integrationClosure: "Connect through public MCP",
    steps: ["implement"],
    verification: ["test"]
  }), /context_insufficient/);

  osLayer.submitContext({
    contractID: goal.contractID,
    currentTruth: ["clean public repository"],
    boundaries: ["no application code"],
    evidence: ["fresh tree inspection"],
    sufficiency: "sufficient"
  });
  const plan = osLayer.issuePlan({
    contractID: goal.contractID,
    integrationClosure: "Connect the requirement to the public OS and MCP flow",
    steps: ["run mock collaboration"],
    protectedSurfaces: ["provider credentials"],
    verification: ["node test"]
  });
  assert.equal(plan.goalHash, goal.goalHash);
});

test("Goal revision stales old plans and loops", () => {
  const osLayer = harness();
  const first = osLayer.begin(goalInput());
  osLayer.confirm({ contractID: first.contractID, confirmedBy: "test-human" });
  osLayer.submitContext({
    contractID: first.contractID,
    currentTruth: ["version one"],
    boundaries: ["public only"],
    evidence: ["inspection"],
    sufficiency: "sufficient"
  });
  const plan = osLayer.issuePlan({
    contractID: first.contractID,
    integrationClosure: "first closure",
    steps: ["first step"],
    verification: ["first test"]
  });
  const loop = osLayer.dispatchLoop({
    contractID: first.contractID,
    planHash: plan.planHash,
    title: "First loop",
    objective: "Build version one"
  });
  osLayer.begin(goalInput({
    outcome: "Ship revised public collaboration example",
    revision: 2,
    parentGoalHash: first.goalHash
  }));
  const status = osLayer.status({ contractID: first.contractID });
  assert.equal(status.goal.status, "superseded");
  assert.equal(status.plans[0].status, "stale");
  assert.equal(status.loops.find(candidate => candidate.loopID === loop.loopID).status, "stale");
});

test("Goal Judge requires aligned loops and evidence for every criterion", () => {
  const osLayer = harness();
  const goal = osLayer.begin(goalInput());
  osLayer.confirm({ contractID: goal.contractID, confirmedBy: "test-human" });
  osLayer.submitContext({
    contractID: goal.contractID,
    currentTruth: ["public beta"],
    boundaries: ["sandbox only"],
    evidence: ["test fixture"],
    sufficiency: "sufficient"
  });
  const plan = osLayer.issuePlan({
    contractID: goal.contractID,
    integrationClosure: "close through Goal Judge",
    steps: ["execute bounded loop"],
    verification: ["mock collaboration passes", "privacy scan passes"]
  });
  const loop = osLayer.dispatchLoop({
    contractID: goal.contractID,
    planHash: plan.planHash,
    title: "Verify public beta",
    objective: "Run all checks"
  });
  osLayer.submitAlignment({
    loopID: loop.loopID,
    status: "aligned",
    criterionEvidence: ["mock collaboration passes", "privacy scan passes"],
    architectureEvidence: ["OS remained above adapters"],
    protectedSurfaceEvidence: ["provider credentials were not read"],
    submittedBy: "loops-executor"
  });
  const judge = osLayer.close({
    contractID: goal.contractID,
    criterionEvidence: ["mock collaboration passes: test output", "privacy scan passes: scan output"],
    judgedBy: "independent-goal-judge"
  });
  assert.equal(judge.passed, true);
});

test("Goal Judge cannot be the Loop evidence submitter", () => {
  const osLayer = harness();
  const goal = osLayer.begin(goalInput());
  osLayer.confirm({ contractID: goal.contractID, confirmedBy: "test-human" });
  osLayer.submitContext({
    contractID: goal.contractID,
    currentTruth: ["public beta"],
    boundaries: ["sandbox only"],
    evidence: ["test fixture"],
    sufficiency: "sufficient"
  });
  const plan = osLayer.issuePlan({
    contractID: goal.contractID,
    integrationClosure: "enforce independent judgment",
    steps: ["execute loop"],
    verification: ["all criteria"]
  });
  const loop = osLayer.dispatchLoop({
    contractID: goal.contractID,
    planHash: plan.planHash,
    title: "Worker loop",
    objective: "Produce evidence"
  });
  osLayer.submitAlignment({
    loopID: loop.loopID,
    status: "aligned",
    criterionEvidence: ["all criteria"],
    architectureEvidence: ["architecture"],
    protectedSurfaceEvidence: ["protected"],
    submittedBy: "same-actor"
  });
  assert.throws(() => osLayer.close({
    contractID: goal.contractID,
    criterionEvidence: ["mock collaboration passes", "privacy scan passes"],
    judgedBy: "same-actor"
  }), /must_be_independent/);
});
