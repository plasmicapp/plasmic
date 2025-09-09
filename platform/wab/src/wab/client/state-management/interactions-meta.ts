import { getTplRefActions } from "@/wab/client/state-management/ref-actions";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ApiDataSource } from "@/wab/shared/ApiSchema";
import {
  isPlainObjectPropType,
  propTypeToWabType,
  StudioPropType,
} from "@/wab/shared/code-components/code-components";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert, ensure, ensureInstance } from "@/wab/shared/common";
import { getContextDependentValue } from "@/wab/shared/context-dependent-value";
import {
  codeLit,
  customCode,
  summarizePath,
  tryExtractJson,
  tryExtractString,
} from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import {
  getStateVarName,
  mkInteraction,
  UpdateVariableOperations,
  updateVariableOperations,
  UpdateVariantOperations,
  updateVariantOperations,
} from "@/wab/shared/core/states";
import {
  EventHandlerKeyType,
  isEventHandlerKeyForAttr,
  isEventHandlerKeyForFuncType,
  isEventHandlerKeyForParam,
} from "@/wab/shared/core/tpls";
import { ALL_QUERIES } from "@/wab/shared/data-sources-meta/data-sources";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { CanvasEnv } from "@/wab/shared/eval";
import {
  DATA_SOURCE_LOWER,
  DATA_SOURCE_OPERATION_LOWER,
  SERVER_QUERY_LOWER,
  VARIABLE_LOWER,
} from "@/wab/shared/Labels";
import {
  CollectionExpr,
  Component,
  CustomCode,
  ensureKnownCustomFunctionExpr,
  ensureKnownDataSourceOpExpr,
  ensureKnownFunctionType,
  ensureKnownObjectPath,
  ensureKnownVarRef,
  EventHandler,
  Expr,
  FunctionExpr,
  Interaction,
  isKnownFunctionType,
  isKnownPageHref,
  isKnownRenderableType,
  isKnownTplRef,
  ObjectPath,
  QueryInvalidationExpr,
  TplComponent,
  TplNode,
  TplRef,
  TplTag,
  VariantsRef,
  VarRef,
} from "@/wab/shared/model/classes";
import {
  getPlaceholderValueToWabType,
  isRenderFuncType,
  typeFactory,
} from "@/wab/shared/model/model-util";
import { SiteInfo } from "@/wab/shared/SharedApi";
import { smartHumanize } from "@/wab/shared/strs";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import { ChoiceValue, mkMetaName } from "@plasmicapp/host";
import { GlobalActionRegistration } from "@plasmicapp/host/registerGlobalContext";
import { get, startCase } from "lodash";

export const BLOCKED_RUN_INTERACTION_MESSAGE = `This action depends on the results of the previous step or the event arguments. You need to manually trigger it through the interactive mode`;
export const BLOCKED_RUN_INTERACTION_ONLY_BY_EVENT_ARGS_MESSAGE = `This action depends on the event arguments. You need to manually trigger it through the interactive mode`;

export interface InteractionContextData {
  component: Component;
  tpl: TplComponent | TplTag;
  currentInteraction: Interaction;
  eventHandlerKey: EventHandlerKeyType;
  viewCtx: ViewCtx;
  sourceMeta: ApiDataSource | undefined;
}
type DistributedKeyOf<T> = T extends any ? keyof T : never;

export interface ActionType<P> {
  displayName: string;
  parameters: {
    [parameter: string]: StudioPropType<P>;
  };
  hidden?: (ctx: { siteInfo: SiteInfo; flags: typeof DEVFLAGS }) => boolean;
  getDefaultName: (
    component: Component,
    args: { [arg in DistributedKeyOf<P>]: Expr | undefined },
    ctx?: InteractionContextData
  ) => string;
  getDefaultArgs: (component: Component) => Record<string, Expr>;
  resetDependentArgs?: (
    args: { [arg in DistributedKeyOf<P>]: Expr | undefined },
    ctx: InteractionContextData,
    updatedArg: string
  ) => void;
}

export const getVariableTypeFromObject = (obj: any) => {
  const jsType = typeof obj;
  if (jsType === "string") {
    return "text";
  } else if (jsType === "number" || jsType === "boolean") {
    return jsType;
  } else if (jsType === "object" && obj != null) {
    return Array.isArray(obj) ? "array" : "object";
  } else {
    return undefined;
  }
};

const ACTIONS = [
  "updateVariable",
  "updateVariant",
  "invokeRefAction",
  "invokeEventHandler",
  "customFunction",
  "invalidateDataQuery",
  "login",
  "logout",
  "navigation",
  "dataSourceOp",
  "customFunctionOp",
] as const;

export const ACTIONS_META: Record<(typeof ACTIONS)[number], ActionType<any>> = {
  updateVariable: {
    displayName: `Update state`,
    parameters: {
      variable: {
        type: "variable",
        displayName: "State",
      },
      operation: {
        type: "choice",
        displayName: "Operation",
        options: ({ variable }, ctx: InteractionContextData) => {
          if (!variable) {
            return [
              ensure(
                updateVariableOperations.find(
                  (op) => op.value === UpdateVariableOperations.NewValue
                ),
                "should always have a new value operation"
              ),
            ];
          }
          const variablePath = ensureKnownObjectPath(variable);
          const data = ctx.viewCtx.getCanvas$StateReferencesForTpl(ctx.tpl);
          const { spec, isImplicitStateArray } =
            ctx.viewCtx.canvasCtx.Sub.reactWeb.getStateSpecInPlasmicProxy(
              data,
              variablePath.path
            ) ?? {};
          const variableType = spec
            ? spec.variableType
            : getVariableTypeFromObject(get(data, variablePath.path));
          return updateVariableOperations.filter(
            (op) => !op.hidden?.(variableType, isImplicitStateArray)
          );
        },
        disableDynamicValue: true,
      },
      value: {
        type: "interactionExprValue",
        displayName: "Value",
        currentInteraction: (_props, ctx: InteractionContextData) =>
          ctx.currentInteraction,
        eventHandlerKey: (_props, ctx: InteractionContextData) =>
          ctx.eventHandlerKey,
        hidden: ({ operation }) =>
          !operation ||
          [
            UpdateVariableOperations.ClearValue,
            UpdateVariableOperations.Decrement,
            UpdateVariableOperations.Increment,
            UpdateVariableOperations.Splice,
            UpdateVariableOperations.Toggle,
          ].includes(tryExtractJson(operation) as UpdateVariableOperations),
      },
      startIndex: {
        type: "number",
        displayName: "Start index",
        hidden: ({ operation }) =>
          !operation ||
          tryExtractJson(operation) !== UpdateVariableOperations.Splice,
      },
      deleteCount: {
        type: "number",
        displayName: "Number of elements to remove",
        hidden: ({ operation }) =>
          !operation ||
          tryExtractJson(operation) !== UpdateVariableOperations.Splice,
      },
    },
    getDefaultName: (_component, { variable }) => {
      if (!variable) {
        return `Update ${VARIABLE_LOWER}`;
      }
      const variablePath = ensureKnownObjectPath(variable);
      return `Update ${summarizePath(variablePath)}`;
    },
    getDefaultArgs: (component) => {
      const maybeState = component.states.find(
        (s) =>
          s.variableType !== "variant" &&
          (!s.implicitState || s.implicitState.accessType !== "readonly")
      );
      if (!maybeState) {
        return {} as Record<string, Expr>;
      }
      return {
        variable: new ObjectPath({
          path: ["$state", ...getStateVarName(maybeState).split(".")],
          fallback: null,
        }),
        operation: new CustomCode({
          code: `${UpdateVariableOperations.NewValue}`,
          fallback: null,
        }),
      };
    },
    resetDependentArgs: (args, ctx, updatedArg) => {
      if (updatedArg !== "variable") {
        return;
      }
      const operationMeta = ACTIONS_META.updateVariable.parameters.operation;
      const options =
        getContextDependentValue(
          isPlainObjectPropType(operationMeta) &&
            operationMeta.type === "choice"
            ? operationMeta.options
            : [],
          args,
          ctx,
          { path: ["operation"] }
        ) ?? [];
      const currValue = args.operation
        ? tryExtractJson(args.operation)
        : undefined;
      if (
        options.length > 0 &&
        !options
          .map((opt) => (typeof opt !== "object" ? opt : opt.value))
          .includes(currValue as ChoiceValue)
      ) {
        args.operation = codeLit(
          typeof options[0] !== "object" ? options[0] : options[0].value
        );
      }
    },
  },
  updateVariant: {
    displayName: "Update variant",
    parameters: {
      vgroup: {
        type: "variantGroup",
        displayName: "Group",
      },
      operation: {
        type: "choice",
        displayName: "Operation",
        options: ({ vgroup: vgroupVarRef }, ctx: InteractionContextData) => {
          if (!vgroupVarRef) {
            return [];
          }
          const vgroup = ctx.component?.variantGroups.find(
            (vg) => vg.param.variable === vgroupVarRef?.variable
          );
          assert(vgroup, `didn't find a variant ${vgroupVarRef?.variable}`);
          return updateVariantOperations.filter((op) => !op.hidden?.(vgroup));
        },
        hidden: ({ vgroup }) => !vgroup,
        disableDynamicValue: true,
      },
      value: {
        type: "variant",
        displayName: "Variants",
        variantGroup: ({ vgroup }) => vgroup,
        hidden: (
          { vgroup: vgroupVarRef, operation },
          ctx: InteractionContextData
        ) => {
          if (!operation || !vgroupVarRef) {
            return true;
          }
          const vgroup = ctx.component?.variantGroups.find(
            (vg) => vg.param.variable === vgroupVarRef?.variable
          );
          assert(vgroup, `didn't find a variant ${vgroupVarRef?.variable}`);
          const operationLit = tryExtractJson(operation);
          return (
            UpdateVariantOperations.ClearValue === operationLit ||
            isStandaloneVariantGroup(vgroup)
          );
        },
      },
    },
    getDefaultName: (_component, { vgroup }) => {
      if (!vgroup) {
        return "Update variant";
      }
      const varRef = ensureKnownVarRef(vgroup);
      return `Update ${varRef.variable.name}`;
    },
    getDefaultArgs: (component): Record<string, Expr> => {
      const maybeVg = component.variantGroups.filter(
        (vg) => vg.variants.length > 0
      )[0];
      if (!maybeVg) {
        return {};
      }
      const variable = maybeVg.param.variable;
      return {
        vgroup: new VarRef({ variable }),
        operation: new CustomCode({
          code: `${
            updateVariantOperations.filter((op) => !op.hidden?.(maybeVg))[0]
              .value
          }`,
          fallback: null,
        }),
        value: new VariantsRef({
          variants: [
            ensure(
              maybeVg.variants[0],
              () =>
                `No variant in VariantGroup ${toVarName(
                  maybeVg.param.variable.name
                )}`
            ),
          ],
        }),
      };
    },
    resetDependentArgs: (args, ctx, updatedArg) => {
      if (updatedArg !== "vgroup") {
        return;
      }
      const operationMeta = ACTIONS_META.updateVariant.parameters.operation;
      const options =
        getContextDependentValue(
          isPlainObjectPropType(operationMeta) &&
            operationMeta.type === "choice"
            ? operationMeta.options
            : [],
          args,
          ctx,
          { path: ["operation"] }
        ) ?? [];
      const currValue = args.operation
        ? tryExtractJson(args.operation)
        : undefined;
      if (
        options.length > 0 &&
        !options
          .map((opt) => (typeof opt !== "object" ? opt : opt.value))
          .includes(currValue as ChoiceValue)
      ) {
        args.operation = codeLit(
          typeof options[0] !== "object" ? options[0] : options[0].value
        );
      }
      delete args.value;
    },
  },
  dataSourceOp: {
    displayName: `Use ${DATA_SOURCE_LOWER}`,
    parameters: {
      dataOp: {
        type: "dataSourceOp",
        displayName: `Configure ${DATA_SOURCE_OPERATION_LOWER}`,
        allowWriteOps: true,
        currentInteraction: (_props, ctx: InteractionContextData) =>
          ctx.currentInteraction,
        eventHandlerKey: (_props, ctx: InteractionContextData) =>
          ctx.eventHandlerKey,
        disableDynamicValue: true,
      },
      continueOnError: {
        type: "boolean",
        displayName: "Continue on error",
        disableDynamicValue: true,
      },
    },
    hidden: (ctx) => !ctx.flags.enableDataQueries,
    getDefaultName: (_, { dataOp }, ctx) => {
      if (!dataOp) {
        return `Use ${DATA_SOURCE_LOWER}`;
      }
      const dataOpExpr = ensureKnownDataSourceOpExpr(dataOp);
      return startCase(`${ctx?.sourceMeta?.source} ${dataOpExpr.opName}`);
    },
    getDefaultArgs: () => ({}),
  },
  customFunctionOp: {
    displayName: `Use ${SERVER_QUERY_LOWER}`,
    parameters: {
      customFunctionOp: {
        type: "customFunctionOp",
        displayName: `Configure ${DATA_SOURCE_OPERATION_LOWER}`,
        currentInteraction: (_props, ctx: InteractionContextData) =>
          ctx.currentInteraction,
        eventHandlerKey: (_props, ctx: InteractionContextData) =>
          ctx.eventHandlerKey,
        disableDynamicValue: true,
      },
      continueOnError: {
        type: "boolean",
        displayName: "Continue on error",
        disableDynamicValue: true,
      },
    },
    getDefaultName: (_, { customFunctionOp }) => {
      if (!customFunctionOp) {
        return `Use ${SERVER_QUERY_LOWER}`;
      }
      const expr = ensureKnownCustomFunctionExpr(customFunctionOp);
      return startCase(
        `${expr.func.namespace} ${
          expr.func.displayName ?? expr.func.importName
        }`
      );
    },
    getDefaultArgs: () => ({}),
    hidden: ({ flags }) => !flags.serverQueries,
  },
  navigation: {
    displayName: "Go to page",
    parameters: {
      destination: {
        type: "href",
        displayName: "Destination",
      },
    },
    getDefaultName: (_component, { destination }) => {
      if (!destination) {
        return "Go to page";
      }
      if (isKnownPageHref(destination)) {
        return `Go to ${destination.page.name}`;
      }
      const value = tryExtractString(destination);
      if (value) {
        return `Go to ${value}`;
      }
      return "Go to page";
    },
    getDefaultArgs: () => ({}),
  },
  customFunction: {
    displayName: "Run code",
    parameters: {
      customFunction: {
        type: "interactionExprValue",
        displayName: "Code",
        currentInteraction: (_props, ctx: InteractionContextData) =>
          ctx.currentInteraction,
        eventHandlerKey: (_props, ctx: InteractionContextData) =>
          ctx.eventHandlerKey,
        dataPicker: true,
        isBodyFunction: true,
        hidePreview: true,
        isRunCodeInteraction: true,
      },
    },
    getDefaultName: () => "Run code",
    getDefaultArgs: () => ({
      customFunction: new FunctionExpr({
        bodyExpr: customCode("undefined"),
        argNames: [],
      }),
    }),
  },
  invokeRefAction: {
    displayName: "Run element action",
    hidden: () => !DEVFLAGS.refActions,
    parameters: {
      tplRef: {
        displayName: "Element",
        type: "tpl",
      },
      action: {
        displayName: "Action",
        type: "choice",
        options: (
          { tplRef }: { tplRef: TplRef },
          ctx: InteractionContextData
        ) => {
          const tpl = tplRef.tpl;
          const actions = ensure(
            getTplRefActions(tpl, ctx),
            "Selected element must support ref actions"
          );
          return Object.entries(actions).map(
            ([aname, ameta]: [string, any]) => ({
              value: aname,
              label: ameta.displayName ?? smartHumanize(aname),
            })
          );
        },
        disableDynamicValue: true,
        hidden: ({ tplRef }) => !tplRef || !tplRef.tpl,
        defaultValueHint: "Pick an action",
      },
      args: {
        displayName: "Arguments",
        type: "functionArgs",
        forExternal: true,
        functionType: (
          { tplRef, action }: { tplRef: TplRef; action: CustomCode },
          ctx: InteractionContextData
        ) => {
          const tpl = tplRef.tpl;
          const actions = ensure(
            getTplRefActions(tpl, ctx),
            "Expected to have ref actions"
          );
          const actionString = ensure(
            tryExtractString(action),
            "action must be selected"
          );
          const actionMeta = actions[actionString];
          return typeFactory.func(
            ...actionMeta.argTypes.map((arg) => {
              const argType = propTypeToWabType(
                ctx.viewCtx.site,
                arg.type
              ).match({
                success: (val) => val,
                failure: () => typeFactory.any(),
              });
              assert(
                !isKnownRenderableType(argType) && !isRenderFuncType(argType),
                () =>
                  `RenderableType and RenderFuncType should only be used for slots`
              );
              assert(
                !isKnownFunctionType(argType),
                () => `Can't have recursive FunctionType`
              );
              return typeFactory.arg(arg.name, argType, arg.displayName);
            })
          );
        },
        parametersMeta: (
          { tplRef, action }: { tplRef: TplRef; action: CustomCode },
          ctx: InteractionContextData
        ) => {
          const tpl = tplRef.tpl;
          const actions = ensure(
            getTplRefActions(tpl, ctx),
            `Expected to have ref actions`
          );
          const actionString = ensure(
            tryExtractString(action),
            "action must be selected"
          );
          return actions[actionString].argTypes;
        },
        isFunctionTypeAttachedToModel: false,
        hidden: ({ tplRef, action }, ctx) => {
          if (!tplRef || !tplRef.tpl || !action) {
            return true;
          }
          const tpl = tplRef.tpl;
          const actions = ensure(
            getTplRefActions(tpl, ctx),
            "Expected to have ref actions"
          );
          const actionString = ensure(
            tryExtractString(action),
            "action must be selected"
          );
          const actionMeta = actions[actionString];
          return actionMeta.argTypes.length === 0;
        },
        currentInteraction: (_props, ctx: InteractionContextData) =>
          ctx.currentInteraction,
        eventHandlerKey: (_props, ctx: InteractionContextData) =>
          ctx.eventHandlerKey,
        targetTpl: ({ tplRef }) => {
          if (!tplRef || !tplRef.tpl) {
            return undefined;
          }
          return tplRef.tpl;
        },
      },
    },
    getDefaultName(component, { tplRef }) {
      if (!isKnownTplRef(tplRef) || !tplRef.tpl) {
        return `Run element action`;
      } else {
        return `Run action on ${
          ensureInstance(tplRef.tpl, TplTag, TplComponent).name
        }`;
      }
    },
    getDefaultArgs() {
      return {};
    },
    resetDependentArgs(args, _ctx, updatedArg) {
      if (["action", "tplRef"].includes(updatedArg)) {
        delete args.args;
      }
      if (updatedArg === "tplRef") {
        delete args.action;
      }
    },
  },
  invokeEventHandler: {
    displayName: "Run interaction prop",
    parameters: {
      eventRef: {
        displayName: "Interaction prop",
        type: "varRef",
        options: (_, ctx: InteractionContextData) =>
          ctx.component.params
            .filter(
              (param) =>
                isKnownFunctionType(param.type) &&
                param.exportType === ParamExportType.External
            )
            .map((param) => param.variable),
      },
      args: {
        displayName: "Arguments",
        type: "functionArgs",
        functionType: ({ eventRef }, ctx: InteractionContextData) =>
          ensureKnownFunctionType(
            ensure(
              ctx.component.params.find(
                (param) => param.variable === eventRef?.variable
              ),
              `didn't find a function type for event ${eventRef?.variable.name}`
            ).type
          ),
        isFunctionTypeAttachedToModel: true,
        hidden: ({ eventRef }, ctx: InteractionContextData) =>
          !ctx.component.params.find(
            (param) => param.variable === eventRef?.variable
          ),
        currentInteraction: (_props, ctx: InteractionContextData) =>
          ctx.currentInteraction,
        eventHandlerKey: (_props, ctx: InteractionContextData) =>
          ctx.eventHandlerKey,
        hidePropName: true,
      },
    },
    getDefaultName: (_component, { eventRef }) => {
      if (!eventRef) {
        return "Run interaction prop";
      }
      return `Run ${ensureKnownVarRef(eventRef).variable.name}`;
    },
    getDefaultArgs: () => ({}),
    resetDependentArgs(args, _ctx, updatedArg) {
      if (updatedArg === "eventRef") {
        delete args.args;
      }
    },
  },
  invalidateDataQuery: {
    displayName: "Refresh data",
    parameters: {
      queryInvalidation: {
        type: "queryInvalidation",
        currentInteraction: (_props, ctx: InteractionContextData) =>
          ctx.currentInteraction,
        eventHandlerKey: (_props, ctx: InteractionContextData) =>
          ctx.eventHandlerKey,
      },
    },
    getDefaultName: () => `Refresh data`,
    getDefaultArgs: () => ({
      queryInvalidation: new QueryInvalidationExpr({
        invalidationKeys: undefined,
        invalidationQueries: [ALL_QUERIES.value],
      }),
    }),
  },
  login: {
    displayName: "Log in",
    hidden: (ctx) => !(ctx.siteInfo.appAuthProvider === "plasmic-auth"),
    parameters: {
      continueTo: {
        displayName: "Continue to",
        type: "href",
      },
    },
    getDefaultName: () => "Log in",
    getDefaultArgs: () => ({}),
  },
  logout: {
    displayName: "Log out",
    hidden: (ctx) => !(ctx.siteInfo.appAuthProvider === "plasmic-auth"),
    parameters: {
      continueTo: {
        displayName: "Continue to",
        type: "href",
      },
    },
    getDefaultName: () => "Log out",
    getDefaultArgs: () => ({}),
  },
};

export function generateInteractionContextData(
  component: Component,
  tpl: TplComponent | TplTag,
  interaction: Interaction,
  eventHandlerKey: EventHandlerKeyType,
  viewCtx: ViewCtx,
  sourceMeta?: ApiDataSource
): InteractionContextData {
  return {
    component,
    tpl,
    currentInteraction: interaction,
    eventHandlerKey,
    viewCtx,
    sourceMeta,
  };
}

export function extractDataCtx(
  viewCtx: ViewCtx,
  tpl: TplNode,
  env: CanvasEnv | undefined,
  currentInteraction: Interaction | undefined,
  eventHandlerKey: EventHandlerKeyType | undefined
) {
  const interactions = currentInteraction?.parent?.interactions ?? [];
  const prevInteractions = interactions.slice(
    0,
    interactions.findIndex((interaction) => interaction === currentInteraction)
  );

  const enabledPreviewSteps = viewCtx.studioCtx.appCtx.appConfig.previewSteps;
  const eventHandlerUid = currentInteraction?.parent?.uid;
  const cachedEventArgs =
    eventHandlerUid != null && enabledPreviewSteps
      ? viewCtx.studioCtx.getCachedInteractionArgs(eventHandlerUid)
      : undefined;
  return {
    ...(env ?? viewCtx.getCanvasEnvForTpl(tpl)),
    ...(prevInteractions.length > 0
      ? {
          $steps: Object.fromEntries(
            prevInteractions.flatMap((interaction) => [
              [
                toVarName(interaction.interactionName),
                enabledPreviewSteps
                  ? viewCtx.studioCtx.getCached$stepValue(interaction.uuid)
                  : undefined,
              ],
              [
                mkMetaName(toVarName(interaction.interactionName)),
                {
                  label: interaction.interactionName,
                  interaction,
                },
              ],
            ])
          ),
          [mkMetaName("$steps")]: {
            label: "Previous step results",
            currentInteraction,
          },
        }
      : {}),
    ...(eventHandlerKey &&
      (isEventHandlerKeyForParam(eventHandlerKey)
        ? Object.fromEntries(
            ensureKnownFunctionType(eventHandlerKey.param.type).params.map(
              (p, i) => [
                p.argName,
                cachedEventArgs
                  ? cachedEventArgs[i]
                  : getPlaceholderValueToWabType(p.type),
              ]
            )
          )
        : isEventHandlerKeyForFuncType(eventHandlerKey)
        ? Object.fromEntries(
            eventHandlerKey.funcType.params.map((p, i) => [
              p.argName,
              cachedEventArgs
                ? cachedEventArgs[i]
                : getPlaceholderValueToWabType(p.type),
            ])
          )
        : isEventHandlerKeyForAttr(eventHandlerKey)
        ? {
            event:
              cachedEventArgs && cachedEventArgs.length > 0
                ? cachedEventArgs[0]
                : {},
          }
        : undefined)),
  } as Record<string, any>;
}

export const DEFAULT_ACTION = "updateVariable";

export const mkDefaultInteraction = (
  eventHandler: EventHandler,
  component: Component
) => {
  const defaultArgs = ACTIONS_META[DEFAULT_ACTION].getDefaultArgs(component);
  return mkInteraction(
    eventHandler,
    DEFAULT_ACTION,
    ACTIONS_META[DEFAULT_ACTION].getDefaultName(component, defaultArgs),
    defaultArgs
  );
};

export function generateActionMetaForGlobalAction(
  globalAction: GlobalActionRegistration<any>
) {
  return {
    displayName: globalAction.displayName ?? "",
    getDefaultArgs: () => ({ args: new CollectionExpr({ exprs: [] }) }),
    getDefaultName: () => "Invoke global action",
    parameters: {
      args: {
        type: "functionArgs",
        displayName: "Arguments",
        forExternal: true,
        functionType: (_args, ctx: InteractionContextData) =>
          typeFactory.func(
            ...globalAction.parameters.map((arg) => {
              const argType = propTypeToWabType(
                ctx.viewCtx.site,
                arg.type
              ).match({
                success: (val) => val,
                failure: () => typeFactory.any(),
              });
              assert(
                !isKnownRenderableType(argType) && !isRenderFuncType(argType),
                () =>
                  `RenderableType and RenderFuncType should only be used for slots`
              );
              assert(
                !isKnownFunctionType(argType),
                () => `Can't have recursive FunctionType`
              );
              return typeFactory.arg(arg.name, argType, arg.displayName);
            })
          ),
        isFunctionTypeAttachedToModel: false,
        parametersMeta: (_args, _ctx: InteractionContextData) =>
          globalAction.parameters,
        currentInteraction: (_props, ctx: InteractionContextData) =>
          ctx.currentInteraction,
        eventHandlerKey: (_props, ctx: InteractionContextData) =>
          ctx.eventHandlerKey,
      },
    },
  } as ActionType<any>;
}
