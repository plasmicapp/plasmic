import {
  assertNever,
  mkShortId,
  switchType,
  unexpected,
} from "@/wab/shared/common";
import * as exprs from "@/wab/shared/core/exprs";
import { UNINITIALIZED_VALUE } from "@/wab/shared/core/sites";
import { StateAccessType, StateVariableType } from "@/wab/shared/core/states";
import { cloneType } from "@/wab/shared/core/tpls";
import {
  Expr,
  GlobalVariantGroupParam,
  NameArg,
  Param,
  PropParam,
  SlotParam,
  State,
  StateChangeHandlerParam,
  StateParam,
  Var,
} from "@/wab/shared/model/classes";
import {
  convertVariableTypeToWabType,
  typeFactory,
} from "@/wab/shared/model/model-util";

// These JSON types are copied from type-fest.
// The reason we don't use the type-fest versions are because the JsonArray
// is annoyingly `JsonValue[] | readonly JsonValue[]`.
// The readonly bit makes it difficult to use in many contexts.

export type JsonObject = { [Key in string]: JsonValue } & {
  [Key in string]?: JsonValue | undefined;
};
export type JsonArray = JsonValue[];
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export function jsonParse<T extends JsonValue>(json: string): T {
  return JSON.parse(json);
}

export function tryJsonParse<T extends JsonValue>(json: string): T | undefined {
  try {
    return jsonParse<T>(json);
  } catch {
    return undefined;
  }
}

export function jsonStringify(json: JsonValue): string {
  return JSON.stringify(json);
}

export const enum ParamExportType {
  // Internal + External Params make up the interface
  // to the PP.render functions.  Internal Params
  // however are not part of the actual React component's
  // prop, so when we instantiate the React component,
  // we do not pass a value for Internal Params.
  Internal = "Internal",
  External = "External",

  // Only used within Plasmic app, never involved
  // in code gen.  This is useful for VariantGroups
  // that primarily hold mock data.
  ToolsOnly = "ToolsOnly",
}

export enum ComponentPropOrigin {
  ReactHTMLAttributes = 1,
}

export function mkNameArg({ name, expr }: { name: string; expr: Expr }) {
  return new NameArg({ name, expr });
}

export function mkOnChangeParamForState(
  variableType: StateVariableType,
  onChangeProp: string,
  opts: {
    privateState: boolean;
  }
) {
  return mkParam({
    name: onChangeProp,
    paramType: "stateChangeHandler",
    type: typeFactory.func(
      typeFactory.arg("val", convertVariableTypeToWabType(variableType))
    ),
    description: "EventHandler",
    exportType: opts.privateState
      ? ParamExportType.ToolsOnly
      : ParamExportType.External,
  });
}

export function mkParamsForState({
  name,
  variableType,
  accessType,
  onChangeProp,
  defaultExpr,
  previewExpr,
}: {
  name: string;
  variableType: StateVariableType;
  defaultExpr?: Expr;
  previewExpr?: Expr;
  accessType: StateAccessType;
  onChangeProp: string;
}) {
  const valueParam = mkParam({
    name,
    type: convertVariableTypeToWabType(variableType),
    paramType: "state",
    exportType:
      accessType === "writable"
        ? ParamExportType.External
        : variableType === "variant"
        ? ParamExportType.Internal
        : ParamExportType.ToolsOnly,
    defaultExpr,
    previewExpr,
    description: variableType,
  });
  const onChangeParam = mkOnChangeParamForState(variableType, onChangeProp, {
    privateState: accessType === "private",
  });
  return { valueParam, onChangeParam };
}

export function mkParamsForImplicitState(
  state: State,
  name: string,
  onChangeProp: string
) {
  const valueParam = mkParam({
    name,
    type: convertVariableTypeToWabType(state.variableType as StateVariableType),
    paramType: "state",
    // implicit states are always private by default
    exportType: ParamExportType.ToolsOnly,
    description: state.variableType,
  });
  const onChangeParam = mkOnChangeParamForState(
    state.variableType as StateVariableType,
    onChangeProp,
    { privateState: true }
  );
  return { valueParam, onChangeParam };
}

export enum ParamTypes {
  Slot = "slot",
  Prop = "prop",
  // eslint-disable-next-line @typescript-eslint/no-shadow
  State = "state",
  GlobalVariantGroup = "globalVariantGroup",
  StateChangeHandler = "stateChangeHandler",
}

type mkParamProps<T extends Param, ParamType extends ParamTypes> = Omit<
  Partial<T>,
  "uuid" | "variable"
> &
  Pick<T, "type"> & {
    name: string;
    paramType: `${ParamType}`;
  };

type PropParamOpts = mkParamProps<PropParam, ParamTypes.Prop> & {
  advanced?: boolean;
};

export function mkParam(
  opts: mkParamProps<SlotParam, ParamTypes.Slot>
): SlotParam;
export function mkParam(opts: PropParamOpts): PropParam;
export function mkParam(
  opts: mkParamProps<GlobalVariantGroupParam, ParamTypes.GlobalVariantGroup>
): GlobalVariantGroupParam;
export function mkParam(
  opts: mkParamProps<StateParam, ParamTypes.State>
): StateParam;
export function mkParam(
  opts: mkParamProps<StateChangeHandlerParam, ParamTypes.StateChangeHandler>
): StateChangeHandlerParam;

export function mkParam(opts: mkParamProps<Param, ParamTypes>) {
  const commonProps = {
    uuid: mkShortId(),
    variable: mkVar(opts.name),
    exportType: opts.exportType || ParamExportType.External,
    defaultExpr: opts.defaultExpr,
    previewExpr: opts.previewExpr,
    enumValues: opts.enumValues || [],
    origin: opts.origin,
    propEffect: opts.propEffect,
    description: opts.description,
    required: !!opts.required,
    displayName: opts.displayName,
    about: opts.about,
    isRepeated: opts.isRepeated,
    isMainContentSlot: opts.isMainContentSlot ?? false,
    mergeWithParent: opts.mergeWithParent ?? false,
    isLocalizable: opts.isLocalizable ?? false,
  };
  switch (opts.paramType) {
    case "slot": {
      const props = opts as mkParamProps<SlotParam, ParamTypes.Slot>;
      return new SlotParam({
        type: props.type,
        tplSlot: UNINITIALIZED_VALUE,
        ...commonProps,
      });
    }
    case "prop": {
      const props = opts as PropParamOpts;
      return new PropParam({
        type: props.type,
        advanced: props.advanced ?? false,
        ...commonProps,
      });
    }
    case "globalVariantGroup": {
      const props = opts as mkParamProps<
        GlobalVariantGroupParam,
        ParamTypes.GlobalVariantGroup
      >;
      return new GlobalVariantGroupParam({
        type: props.type,
        ...commonProps,
      });
    }
    case "state": {
      const props = opts as mkParamProps<StateParam, ParamTypes.State>;
      return new StateParam({
        type: props.type,
        state: UNINITIALIZED_VALUE,
        ...commonProps,
      });
    }
    case "stateChangeHandler": {
      const props = opts as mkParamProps<
        StateChangeHandlerParam,
        ParamTypes.StateChangeHandler
      >;
      return new StateChangeHandlerParam({
        type: props.type,
        state: UNINITIALIZED_VALUE,
        ...commonProps,
      });
    }
    default:
      assertNever(opts.paramType);
      unexpected();
  }
}

export function cloneParamAndVar<T extends Param>(param_: T): T {
  const commonProps = {
    variable: mkVar(param_.variable.name),
    uuid: mkShortId(),
    exportType: param_.exportType as ParamExportType,
    defaultExpr: param_.defaultExpr
      ? exprs.clone(param_.defaultExpr)
      : undefined,
    previewExpr: param_.previewExpr
      ? exprs.clone(param_.previewExpr)
      : undefined,
    enumValues: param_.enumValues?.slice(0),
    origin: param_.origin,
    propEffect: param_.propEffect,
    description: param_.description,
    required: param_.required,
    displayName: param_.displayName,
    about: param_.about,
    isRepeated: param_.isRepeated,
    isMainContentSlot: param_.isMainContentSlot,
    mergeWithParent: param_.mergeWithParent,
    isLocalizable: param_.isLocalizable,
  };
  return switchType(param_ as Param)
    .when(
      SlotParam,
      (p) =>
        new SlotParam({
          ...commonProps,
          type: cloneType(p.type),
          tplSlot: UNINITIALIZED_VALUE,
        })
    )
    .when(
      PropParam,
      (p) =>
        new PropParam({
          ...commonProps,
          type: cloneType(p.type),
          advanced: p.advanced,
        })
    )
    .when(
      GlobalVariantGroupParam,
      (p) =>
        new GlobalVariantGroupParam({
          ...commonProps,
          type: cloneType(p.type),
        })
    )
    .when(
      StateParam,
      (p) =>
        new StateParam({
          ...commonProps,
          type: cloneType(p.type),
          state: UNINITIALIZED_VALUE,
        })
    )
    .when(
      StateChangeHandlerParam,
      (p) =>
        new StateChangeHandlerParam({
          ...commonProps,
          type: cloneType(p.type),
          state: UNINITIALIZED_VALUE,
        })
    )
    .result() as T;
}

export function mkVar(name: string) {
  return new Var({ name, uuid: mkShortId() });
}
