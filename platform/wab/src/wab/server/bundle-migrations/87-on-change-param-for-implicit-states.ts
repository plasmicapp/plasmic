import { mkShortId, mkUuid } from "@/wab/shared/common";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { StateVariableType } from "@/wab/shared/core/states";

export function convertVariableTypeToWabType(variableType: StateVariableType) {
  switch (variableType) {
    case "text":
      return {
        name: "text",
        __type: "Text",
      };
    case "number":
      return {
        name: "num",
        __type: "Num",
      };
    case "boolean":
      return {
        name: "bool",
        __type: "Bool",
      };
    case "object":
      return {
        name: "any",
        __type: "Any",
      };
    case "array":
      return {
        name: "any",
        __type: "Any",
      };
    default:
      throw new Error(`Unexpected state variable type "${variableType}"`);
  }
}

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
    if (state.accessType === "private") {
      delete state["onChangeProp"];
      state["onChangeParam"] = null;
      continue;
    }
    // Find component containing current state.
    const componentId = componentIds.find((cId) => {
      const component = bundle.map[cId];
      return component["states"].some((sRef) => `${sRef["__ref"]}` === stateId);
    });
    if (!componentId) {
      throw new Error(`Could not find component for state "${stateId}"`);
    }
    const component = bundle.map[componentId];
    // Delete state.onChangeProp (but keep values to use below).
    const onChangeProp =
      state["onChangeProp"] === null ? mkUuid() : state["onChangeProp"];
    delete state["onChangeProp"];

    const variable = {
      name: onChangeProp,
      uuid: mkShortId(),
      __type: "Var",
    };
    const varId = `${mkShortId()}`;
    bundle.map[varId] = variable;

    const paramType = convertVariableTypeToWabType(state["variableType"]);
    const paramTypeId = `${mkShortId()}`;
    bundle.map[paramTypeId] = paramType;

    const onChangeParamTpe = {
      name: "func0",
      params: [
        {
          __ref: paramTypeId,
        },
      ],
      __type: "OpaqueType",
    };
    const onChangeParamTypeId = `${mkShortId()}`;
    bundle.map[onChangeParamTypeId] = onChangeParamTpe;

    const onChangeParam = {
      variable: { __ref: varId },
      type: { __ref: onChangeParamTypeId },
      uuid: mkShortId(),
      enumValues: [],
      origin: null,
      exportType: "External",
      defaultExpr: null,
      propEffect: null,
      description: "EventHandler",
      displayName: null,
      about: null,
      isRepeated: null,
      required: false,
      __type: "Param",
    };
    const onChangeParamId = `${mkShortId()}`;
    bundle.map[onChangeParamId] = onChangeParam;

    const paramRef = { __ref: onChangeParamId };
    state["onChangeParam"] = paramRef;
    component["params"].push(paramRef);
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
