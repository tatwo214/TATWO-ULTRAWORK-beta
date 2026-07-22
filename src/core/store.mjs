import fs from "node:fs";
import path from "node:path";
import { ensureDir, safeJSON, stateRoot } from "./util.mjs";

const defaultState = {
  schema: "TatwoPublicStateV1",
  goals: {},
  plans: {},
  loops: {},
  conflicts: {},
  sandboxes: {}
};

export class StateStore {
  constructor(root = stateRoot()) {
    this.root = ensureDir(root);
    this.file = path.join(this.root, "state.json");
  }

  load() {
    if (!fs.existsSync(this.file)) return structuredClone(defaultState);
    const parsed = JSON.parse(fs.readFileSync(this.file, "utf8"));
    return { ...structuredClone(defaultState), ...parsed };
  }

  save(state) {
    ensureDir(this.root);
    const temp = `${this.file}.next`;
    fs.writeFileSync(temp, `${JSON.stringify(safeJSON(state), null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temp, this.file);
    return state;
  }

  update(mutator) {
    const state = this.load();
    const result = mutator(state);
    this.save(state);
    return result;
  }
}
