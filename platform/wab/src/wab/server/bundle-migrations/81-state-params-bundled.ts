import { mkShortId, mkUuid } from "@/wab/shared/common";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

/**
 * This migration turns `State { name: X, initVal: Y, ... }` into
 * `State { param: { variable: { name: X }, defaultExpr: Y }, ...}`. If a
 * state has type "variant", we just use the param for the corresponding
 * variant group. Otherwise we construct a new param (with a new var) and
 * insert it on component.params.
 */
export const migrate: BundledMigrationFn = async (bundle) => {
  // First, we compute de next IID to assign to new elements in the bundle
  // and create lists of component and state refs.
  // containing a state below.
  const componentIds: string[] = [];
  const stateIds: string[] = [];
  for (const [id, inst] of Object.entries(bundle.map)) {
    if (inst.__type === "Component") {
      componentIds.push(id);
    }
    if (inst.__type === "State") {
      stateIds.push(id);
    }
  }

  // Now we iterate in states to update the schema.
  for (const stateId of stateIds) {
    const state = bundle.map[stateId];

    // Find component containing current state.
    const componentId = componentIds.find((cId) => {
      const component = bundle.map[cId];
      return component["states"].some((sRef) => `${sRef["__ref"]}` === stateId);
    });
    if (!componentId) {
      throw new Error(`Could not find component for state "${stateId}"`);
    }
    const component = bundle.map[componentId];

    // Delete state.name and state.initVal (but keep values to use below).
    const stateName = state["name"] === "" ? mkUuid() : state["name"];
    const stateExprRef = state["initVal"];
    delete state["name"];
    delete state["initVal"];

    if (state["variableType"] === "variant") {
      // State corresponds to variant group. In this case, just assign to
      // state.param the existing param that corresponds to its variant
      // group.

      const paramRef = component["params"].find((pRef) => {
        const param = bundle.map[`${pRef["__ref"]}`];
        const varRef = param.variable;
        const variable = bundle.map[`${varRef["__ref"]}`];
        return variable["name"] === stateName;
      });

      if (!paramRef) {
        throw new Error(`Could not find param named "${stateName}"`);
      }

      state["param"] = paramRef;
      bundle.map[`${paramRef["__ref"]}`].defaultExpr = stateExprRef;
    } else {
      // State does not correspond to variant group. In this case, we must:
      // create a new param (and a new var), push it to component.params and
      // assign it to state.param.

      const variable = {
        name: stateName,
        uuid: mkShortId(),
        __type: "Var",
      };

      const varId = mkShortId();
      bundle.map[varId] = variable;

      const type = {
        name: "any",
        __type: "Any",
      };

      const typeId = mkShortId();
      bundle.map[typeId] = type;

      const param = {
        variable: { __ref: varId },
        type: { __ref: typeId },
        uuid: mkShortId(),
        enumValues: [],
        origin: null,
        exportType: "ToolsOnly",
        defaultExpr: stateExprRef,
        propEffect: null,
        description: null,
        displayName: null,
        about: null,
        isRepeated: null,
        required: false,
        __type: "Param",
      };

      const paramId = mkShortId();
      bundle.map[paramId] = param;

      const paramRef = { __ref: paramId };
      state["param"] = paramRef;
      component["params"].push(paramRef);
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
