import { StateStore } from "./store.mjs";
import { hash, id, now, requireObject, requireString, uniqueStrings } from "./util.mjs";

function goalMaterial(input) {
  return {
    outcome: requireString(input.outcome ?? input.goal, "outcome"),
    criteria: uniqueStrings(input.criteria),
    nonGoals: uniqueStrings(input.nonGoals),
    constraints: uniqueStrings(input.constraints),
    projectPrinciples: uniqueStrings(input.projectPrinciples),
    architectureAnchors: uniqueStrings(input.architectureAnchors),
    protectedSurfaces: uniqueStrings(input.protectedSurfaces),
    revision: Number(input.revision ?? 1),
    parentGoalHash: input.parentGoalHash ? String(input.parentGoalHash) : null
  };
}

function validateGoal(goal) {
  if (!goal.criteria.length) throw new Error("criteria_required");
  if (!goal.projectPrinciples.length) throw new Error("project_principles_required");
  if (!goal.architectureAnchors.length) throw new Error("architecture_anchors_required");
  if (!goal.protectedSurfaces.length) throw new Error("protected_surfaces_required");
}

export class TatwoOS {
  constructor(store = new StateStore()) {
    this.store = store;
  }

  begin(input) {
    requireObject(input, "goal");
    const material = goalMaterial(input);
    validateGoal(material);
    const goalHash = hash(material);
    const contractID = id("contract", { goalHash, createdAt: now() });
    const record = {
      schema: "GoalContractV1",
      contractID,
      goalHash,
      ...material,
      status: "provisional",
      confirmation: null,
      goalSufficiency: "insufficient",
      contextSufficiency: "insufficient",
      contextReceipt: null,
      stalePlanHashes: [],
      createdAt: now(),
      updatedAt: now()
    };
    return this.store.update(state => {
      if (material.parentGoalHash) {
        const parent = Object.values(state.goals).find(goal => goal.goalHash === material.parentGoalHash);
        if (!parent) throw new Error("parent_goal_not_found");
        parent.status = "superseded";
        parent.updatedAt = now();
        for (const plan of Object.values(state.plans)) {
          if (plan.goalHash === parent.goalHash && plan.status !== "stale") {
            plan.status = "stale";
            record.stalePlanHashes.push(plan.planHash);
          }
        }
        for (const loop of Object.values(state.loops)) {
          if (loop.goalHash === parent.goalHash) loop.status = "stale";
        }
      }
      state.goals[contractID] = record;
      return record;
    });
  }

  submitContext(input) {
    const contractID = requireString(input.contractID, "contractID");
    const receipt = {
      schema: "ContextArchitectureReceiptV1",
      currentTruth: uniqueStrings(input.currentTruth),
      actors: uniqueStrings(input.actors),
      objects: uniqueStrings(input.objects),
      boundaries: uniqueStrings(input.boundaries),
      dependencies: uniqueStrings(input.dependencies),
      flows: uniqueStrings(input.flows),
      contradictions: uniqueStrings(input.contradictions),
      unresolvedUnknowns: uniqueStrings(input.unresolvedUnknowns),
      evidence: uniqueStrings(input.evidence),
      sufficiency: String(input.sufficiency ?? "insufficient"),
      createdAt: now()
    };
    if (!["insufficient", "provisional", "sufficient", "stale"].includes(receipt.sufficiency)) {
      throw new Error("invalid_context_sufficiency");
    }
    if (receipt.sufficiency === "sufficient" && (!receipt.currentTruth.length || !receipt.boundaries.length || !receipt.evidence.length)) {
      throw new Error("sufficient_context_requires_truth_boundaries_and_evidence");
    }
    receipt.contextHash = hash(receipt);
    return this.store.update(state => {
      const goal = state.goals[contractID];
      if (!goal) throw new Error("contract_not_found");
      goal.contextReceipt = receipt;
      goal.contextSufficiency = receipt.sufficiency;
      goal.updatedAt = now();
      return receipt;
    });
  }

  confirm(input) {
    const contractID = requireString(input.contractID, "contractID");
    const confirmedBy = requireString(input.confirmedBy ?? "human", "confirmedBy");
    return this.store.update(state => {
      const goal = state.goals[contractID];
      if (!goal) throw new Error("contract_not_found");
      goal.confirmation = { confirmedBy, confirmedAt: now(), goalHash: goal.goalHash };
      goal.goalSufficiency = "sufficient";
      goal.status = goal.contextSufficiency === "sufficient" ? "ready" : "provisional";
      goal.updatedAt = now();
      return goal;
    });
  }

  next(input) {
    const goal = this.getGoal(input.contractID);
    if (goal.goalSufficiency !== "sufficient") {
      return { action: "human_decision", question: "Confirm the Goal Contract before planning.", blocker: "goal_insufficient" };
    }
    if (goal.contextSufficiency !== "sufficient") {
      const unknown = goal.contextReceipt?.unresolvedUnknowns?.[0];
      return {
        action: "context_discovery",
        question: unknown || "Submit evidence-backed current truth, boundaries, dependencies, and flows.",
        blocker: "context_insufficient"
      };
    }
    const plans = Object.values(this.store.load().plans).filter(plan => plan.contractID === goal.contractID && plan.status !== "stale");
    if (!plans.length) return { action: "issue_plan", blocker: null };
    const openLoops = Object.values(this.store.load().loops).filter(loop => loop.contractID === goal.contractID && !["passed", "stale"].includes(loop.status));
    if (openLoops.length) return { action: "continue_loops", loopIDs: openLoops.map(loop => loop.loopID), blocker: null };
    return { action: "goal_judge", blocker: null };
  }

  issuePlan(input) {
    const contractID = requireString(input.contractID, "contractID");
    const goal = this.getGoal(contractID);
    this.assertOperational(goal);
    const planMaterial = {
      goalHash: goal.goalHash,
      contextHash: goal.contextReceipt.contextHash,
      integrationClosure: requireString(input.integrationClosure, "integrationClosure"),
      steps: uniqueStrings(input.steps),
      protectedSurfaces: uniqueStrings(input.protectedSurfaces),
      verification: uniqueStrings(input.verification)
    };
    if (!planMaterial.steps.length || !planMaterial.verification.length) throw new Error("plan_steps_and_verification_required");
    const planHash = hash(planMaterial);
    const record = {
      schema: "PlanContractV1",
      planID: id("plan", { contractID, planHash }),
      contractID,
      planHash,
      ...planMaterial,
      status: "active",
      createdAt: now()
    };
    return this.store.update(state => {
      for (const plan of Object.values(state.plans)) {
        if (plan.contractID === contractID && plan.status === "active") plan.status = "stale";
      }
      state.plans[record.planID] = record;
      return record;
    });
  }

  dispatchLoop(input) {
    const contractID = requireString(input.contractID, "contractID");
    const planHash = requireString(input.planHash, "planHash");
    const goal = this.getGoal(contractID);
    this.assertOperational(goal);
    const state = this.store.load();
    const plan = Object.values(state.plans).find(candidate =>
      candidate.contractID === contractID && candidate.planHash === planHash && candidate.status === "active");
    if (!plan) throw new Error("active_plan_not_found");
    const record = {
      schema: "LoopTaskV1",
      loopID: id("loop", { contractID, planHash, title: input.title, createdAt: now() }),
      contractID,
      goalHash: goal.goalHash,
      planHash,
      title: requireString(input.title, "title"),
      objective: requireString(input.objective, "objective"),
      identity: requireString(input.identity ?? "Loops Executor", "identity"),
      allowedTools: uniqueStrings(input.allowedTools),
      requiredEvidence: uniqueStrings(input.requiredEvidence),
      status: "issued",
      alignmentReceipts: [],
      createdAt: now(),
      updatedAt: now()
    };
    return this.store.update(next => {
      next.loops[record.loopID] = record;
      return record;
    });
  }

  submitAlignment(input) {
    const loopID = requireString(input.loopID, "loopID");
    const status = requireString(input.status, "status");
    if (!["aligned", "diverged", "blocked"].includes(status)) throw new Error("invalid_alignment_status");
    return this.store.update(state => {
      const loop = state.loops[loopID];
      if (!loop) throw new Error("loop_not_found");
      const goal = state.goals[loop.contractID];
      const plan = Object.values(state.plans).find(candidate => candidate.planHash === loop.planHash);
      if (!goal || goal.goalHash !== loop.goalHash || !plan || plan.status !== "active") {
        loop.status = "stale";
        throw new Error("loop_contract_or_plan_stale");
      }
      const receipt = {
        schema: "GoalAlignmentReceiptV1",
        receiptID: id("alignment", { loopID, status, createdAt: now() }),
        loopID,
        goalHash: loop.goalHash,
        planHash: loop.planHash,
        criterionEvidence: uniqueStrings(input.criterionEvidence),
        architectureEvidence: uniqueStrings(input.architectureEvidence),
        protectedSurfaceEvidence: uniqueStrings(input.protectedSurfaceEvidence),
        submittedBy: requireString(input.submittedBy, "submittedBy"),
        status,
        createdAt: now()
      };
      if (status === "aligned" && (!receipt.criterionEvidence.length || !receipt.architectureEvidence.length || !receipt.protectedSurfaceEvidence.length)) {
        throw new Error("aligned_receipt_requires_all_evidence_classes");
      }
      loop.alignmentReceipts.push(receipt);
      loop.status = status === "aligned" ? "passed" : status === "diverged" ? "human_gate" : "blocked";
      loop.updatedAt = now();
      return receipt;
    });
  }

  resolveConflict(input) {
    const contractID = requireString(input.contractID, "contractID");
    const record = {
      schema: "GoalConflictResolutionV1",
      conflictID: id("conflict", { contractID, conflict: input.conflict, createdAt: now() }),
      contractID,
      conflict: requireString(input.conflict, "conflict"),
      decision: requireString(input.decision, "decision"),
      decidedBy: requireString(input.decidedBy ?? "human", "decidedBy"),
      createdAt: now()
    };
    return this.store.update(state => {
      if (!state.goals[contractID]) throw new Error("contract_not_found");
      state.conflicts[record.conflictID] = record;
      return record;
    });
  }

  close(input) {
    const contractID = requireString(input.contractID, "contractID");
    const judgedBy = requireString(input.judgedBy, "judgedBy");
    return this.store.update(state => {
      const goal = state.goals[contractID];
      if (!goal) throw new Error("contract_not_found");
      this.assertOperational(goal);
      const loops = Object.values(state.loops).filter(loop => loop.contractID === contractID);
      const activePlan = Object.values(state.plans).find(plan => plan.contractID === contractID && plan.status === "active");
      const unresolved = Object.values(state.conflicts).filter(conflict => conflict.contractID === contractID && !conflict.decision);
      const evidence = uniqueStrings(input.criterionEvidence);
      const missingCriteria = goal.criteria.filter(criterion => !evidence.some(item => item.includes(criterion)));
      const executorIdentities = loops.flatMap(loop => loop.alignmentReceipts.map(receipt => receipt.submittedBy));
      if (executorIdentities.includes(judgedBy)) throw new Error("goal_judge_must_be_independent");
      const passed = Boolean(activePlan) && loops.length > 0 && loops.every(loop => loop.status === "passed") &&
        !unresolved.length && !missingCriteria.length;
      const receipt = {
        schema: "GoalJudgeReceiptV1",
        contractID,
        goalHash: goal.goalHash,
        planHash: activePlan?.planHash ?? null,
        passed,
        judgedBy,
        missingCriteria,
        loopOutcomes: loops.map(loop => ({ loopID: loop.loopID, status: loop.status })),
        decision: passed ? "passed" : "replan_or_rollback",
        createdAt: now()
      };
      goal.status = passed ? "passed" : "human_gate";
      goal.updatedAt = now();
      return receipt;
    });
  }

  status(input = {}) {
    const state = this.store.load();
    if (input.contractID) {
      const goal = state.goals[input.contractID];
      if (!goal) throw new Error("contract_not_found");
      return {
        goal,
        plans: Object.values(state.plans).filter(plan => plan.contractID === input.contractID),
        loops: Object.values(state.loops).filter(loop => loop.contractID === input.contractID),
        conflicts: Object.values(state.conflicts).filter(conflict => conflict.contractID === input.contractID)
      };
    }
    return {
      goals: Object.values(state.goals),
      plans: Object.values(state.plans),
      loops: Object.values(state.loops)
    };
  }

  getGoal(contractID) {
    const idValue = requireString(contractID, "contractID");
    const goal = this.store.load().goals[idValue];
    if (!goal) throw new Error("contract_not_found");
    return goal;
  }

  assertOperational(goal) {
    if (goal.status === "superseded") throw new Error("goal_stale");
    if (goal.goalSufficiency !== "sufficient") throw new Error("goal_insufficient");
    if (goal.contextSufficiency !== "sufficient") throw new Error("context_insufficient");
  }
}
