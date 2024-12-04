import { ensureBaseVariant } from "@/wab/shared/TplMgr";
import { VariantCombo } from "@/wab/shared/Variants";
import { isCodeComponentWithHelpers } from "@/wab/shared/code-components/code-components";
import {
  getImportedCodeComponentHelperName,
  makePlasmicIsPreviewRootComponent,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import {
  getOrderedExplicitVSettings,
  joinVariantVals,
} from "@/wab/shared/codegen/react-p/utils";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import { arrayEq } from "@/wab/shared/common";
import { getRawCode } from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import {
  getStateOnChangePropName,
  getStateValuePropName,
  getStateVarName,
  getVirtualWritableStateInitialValue,
  isReadonlyState,
  isWritableState,
} from "@/wab/shared/core/states";
import {
  ancestorsUp,
  isTplCodeComponent,
  isTplComponent,
  isTplRepeated,
  isTplTag,
  tplHasRef,
} from "@/wab/shared/core/tpls";
import {
  Component,
  State,
  ensureKnownNamedState,
} from "@/wab/shared/model/classes";

export function serializeInitFunc(
  state: State,
  ctx: SerializerBaseContext,
  isForRegisterInitFunc?: boolean
) {
  let initFunc: undefined | string = undefined;
  if (
    state.tplNode &&
    ancestorsUp(state.tplNode).filter(isTplRepeated).length > 0 &&
    !isForRegisterInitFunc
  ) {
    return undefined;
  }
  const exprCtx = ctx.exprCtx;
  if (!state.tplNode && state.variableType === "variant") {
    initFunc = `({$props, $state, $queries, $ctx}) => (${
      state.param.defaultExpr
        ? getRawCode(state.param.defaultExpr, exprCtx) + " ?? "
        : ""
    } $props.${getStateValuePropName(state)})`;
  } else if (!state.tplNode && state.param.defaultExpr) {
    initFunc = `({$props, $state, $queries, $ctx}) => (${getRawCode(
      state.param.defaultExpr,
      exprCtx
    )})`;
  } else if (state.tplNode) {
    const tpl = state.tplNode;
    const exprs: [string, VariantCombo][] = [];
    for (const vs of getOrderedExplicitVSettings(ctx, tpl)) {
      if (isTplComponent(tpl)) {
        const arg = vs.args.find(
          (vsArg) => vsArg.param === state.implicitState?.param
        );
        if (arg) {
          exprs.push([getRawCode(arg.expr, exprCtx), vs.variants]);
        }
      } else if (isTplTag(tpl)) {
        const namedState = ensureKnownNamedState(state);
        const varName = toVarName(namedState.name);
        if (varName in vs.attrs) {
          exprs.push([getRawCode(vs.attrs[varName], exprCtx), vs.variants]);
        }
      }
    }
    const baseVariant = ensureBaseVariant(ctx.component);
    if (
      state.implicitState &&
      isWritableState(state.implicitState) &&
      !exprs.some(([_expr, variantCombo]) =>
        arrayEq(variantCombo, [baseVariant])
      )
    ) {
      const initExpr = getVirtualWritableStateInitialValue(state);
      if (initExpr) {
        exprs.unshift([getRawCode(initExpr, exprCtx), [baseVariant]]);
      }
    }
    if (
      isTplCodeComponent(tpl) &&
      state.implicitState &&
      isReadonlyState(state.implicitState) &&
      state.implicitState?.param.defaultExpr
    ) {
      // initializing readonly state from code commponents
      // writable states are initialized with the value prop
      exprs.unshift([
        getRawCode(state.implicitState.param.defaultExpr, exprCtx),
        [baseVariant],
      ]);
    }
    initFunc = `({$props, $state, $queries${
      !isForRegisterInitFunc ? ", $ctx" : ""
    }}) => (${
      joinVariantVals(exprs, ctx.variantComboChecker, "undefined").value
    })`;
  }
  if (
    !initFunc ||
    (isWritableState(state) && !ctx.exportOpts.shouldTransformWritableStates)
  ) {
    return undefined;
  } else if (isWritableState(state)) {
    return `$props["${makePlasmicIsPreviewRootComponent()}"] ? ${initFunc} : undefined`;
  } else {
    return initFunc;
  }
}

export function serializeStateSpecs(
  component: Component,
  ctx: SerializerBaseContext
) {
  const serializeState = (state: State) => {
    const initFunc = serializeInitFunc(state, ctx);

    let valueProp = ``;
    if (
      !ctx.exportOpts.shouldTransformWritableStates &&
      isWritableState(state)
    ) {
      valueProp = `valueProp: "${getStateValuePropName(state)}",`;
    } else if (
      ctx.exportOpts.shouldTransformWritableStates &&
      isWritableState(state)
    ) {
      valueProp = `...(!$props["${makePlasmicIsPreviewRootComponent()}"]
        ? { valueProp: "${getStateValuePropName(state)}" }
        : { }
      ),`;
    }

    const { nodeNamer } = ctx;
    const codeComponentHelperName =
      state.tplNode &&
      isTplComponent(state.tplNode) &&
      isCodeComponentWithHelpers(state.tplNode.component)
        ? getImportedCodeComponentHelperName(
            ctx.aliases,
            state.tplNode.component
          )
        : "undefined";

    return `{
      path: "${getStateVarName(state)}",
      type: ${
        !ctx.exportOpts.shouldTransformWritableStates || !isWritableState(state)
          ? `"${state.accessType}"`
          : `$props["${makePlasmicIsPreviewRootComponent()}"] ? "private" : "writable"`
      },
      variableType: "${state.variableType}",
      ${initFunc ? `initFunc: ${initFunc},` : ""}
      ${valueProp}
      ${
        state.onChangeParam.exportType !== ParamExportType.ToolsOnly
          ? `onChangeProp: "${getStateOnChangePropName(state)}",`
          : ``
      }
      ${
        state.tplNode &&
        isTplComponent(state.tplNode) &&
        tplHasRef(state.tplNode)
          ? `refName: ${jsLiteral(nodeNamer(state.tplNode))},`
          : ``
      }
      ${
        state.tplNode &&
        isTplComponent(state.tplNode) &&
        isCodeComponentWithHelpers(state.tplNode.component)
          ? `onMutate: generateOnMutateForSpec("${
              ensureKnownNamedState(state.implicitState).name
            }", ${codeComponentHelperName})`
          : ``
      }
    }`;
  };

  return `[${component.states
    .filter((state) => !state.tplNode || !ctx.fakeTpls.includes(state.tplNode))
    .map((state) => serializeState(state))
    .join(",")}]`;
}
