import { TatwoOS } from "../core/os.mjs";
import { dispatch, fanout, listAdapters } from "../adapters/dispatch.mjs";
import { Sandbox } from "../sandbox/sandbox.mjs";

const definition = (name, description, properties = {}, required = []) => ({
  name,
  description,
  inputSchema: { type: "object", properties, required, additionalProperties: true }
});

export const toolDefinitions = [
  definition("tatwo.os.begin", "Create a provisional Goal Contract.", {}, ["outcome", "criteria", "projectPrinciples", "architectureAnchors", "protectedSurfaces"]),
  definition("tatwo.context.submit", "Submit evidence-backed context and architecture discovery.", {}, ["contractID", "currentTruth", "boundaries", "evidence", "sufficiency"]),
  definition("tatwo.goal.confirm", "Human-confirm a Goal Contract.", {}, ["contractID"]),
  definition("tatwo.os.next", "Return exactly one highest-impact next action or question.", {}, ["contractID"]),
  definition("tatwo.goal.conflict.resolve", "Record a material conflict decision.", {}, ["contractID", "conflict", "decision"]),
  definition("tatwo.plan.issue", "Issue an operational plan bound to goalHash and contextHash.", {}, ["contractID", "integrationClosure", "steps", "verification"]),
  definition("tatwo.loops.dispatch", "Issue a bounded loop task.", {}, ["contractID", "planHash", "title", "objective"]),
  definition("tatwo.loops.status", "Read Goal, Plan, Loop, and conflict state."),
  definition("tatwo.goal.alignment.submit", "Submit criterion, architecture, and protected-surface evidence.", {}, ["loopID", "status", "submittedBy"]),
  definition("tatwo.goal.close", "Run an independent Goal Judge against criteria and loop evidence.", {}, ["contractID", "criterionEvidence", "judgedBy"]),
  definition("tatwo.gateway.models", "List configured provider-neutral adapters."),
  definition("tatwo.gateway.dispatch", "Dispatch one advisory task, or a contract-bound task when contractID and loopID are supplied.", {}, ["adapterID", "prompt"]),
  definition("tatwo.gateway.fanout", "Dispatch multiple independent advisory or contract-bound tasks.", {}, ["requests"]),
  definition("tatwo.sandbox.preflight", "Check restricted Docker execution availability."),
  definition("tatwo.sandbox.begin", "Copy a safe project snapshot into an isolated workspace.", {}, ["contractID", "source"]),
  definition("tatwo.sandbox.run", "Run an allowlisted command in the restricted container.", {}, ["sandboxID", "command"]),
  definition("tatwo.sandbox.receipt", "Read sandbox execution receipts.", {}, ["sandboxID"]),
  definition("tatwo.doctor", "Inspect OS, adapter, and sandbox readiness.")
];

export async function callTool(name, args = {}) {
  const os = new TatwoOS();
  const sandbox = new Sandbox();
  const bindGateway = request => {
    if (!request.contractID && !request.loopID) return { ...request, authority: "advisory" };
    if (!request.contractID || !request.loopID) throw new Error("gateway_contractID_and_loopID_required_together");
    const status = os.status({ contractID: request.contractID });
    const loop = status.loops.find(candidate => candidate.loopID === request.loopID);
    if (!loop || loop.status !== "issued") throw new Error("gateway_loop_not_active");
    if (request.planHash && request.planHash !== loop.planHash) throw new Error("gateway_plan_hash_mismatch");
    return {
      ...request,
      authority: "contract_bound",
      goalHash: loop.goalHash,
      planHash: loop.planHash
    };
  };
  switch (name) {
    case "tatwo.os.begin": return os.begin(args);
    case "tatwo.context.submit": return os.submitContext(args);
    case "tatwo.goal.confirm": return os.confirm(args);
    case "tatwo.os.next": return os.next(args);
    case "tatwo.goal.conflict.resolve": return os.resolveConflict(args);
    case "tatwo.plan.issue": return os.issuePlan(args);
    case "tatwo.loops.dispatch": return os.dispatchLoop(args);
    case "tatwo.loops.status": return os.status(args);
    case "tatwo.goal.alignment.submit": return os.submitAlignment(args);
    case "tatwo.goal.close": return os.close(args);
    case "tatwo.gateway.models": return { schema: "AdapterListV1", adapters: listAdapters() };
    case "tatwo.gateway.dispatch": return dispatch(bindGateway(args));
    case "tatwo.gateway.fanout": return fanout({ ...args, requests: (args.requests || []).map(bindGateway) });
    case "tatwo.sandbox.preflight": return sandbox.preflight();
    case "tatwo.sandbox.begin": return sandbox.begin(args);
    case "tatwo.sandbox.run": return sandbox.run(args);
    case "tatwo.sandbox.receipt": return sandbox.receipt(args);
    case "tatwo.doctor": return {
      schema: "TatwoDoctorV1",
      node: process.version,
      adapters: listAdapters(),
      sandbox: sandbox.preflight(),
      osState: os.status(),
      hostMutationAllowed: false
    };
    default: throw new Error("unknown_tool");
  }
}
