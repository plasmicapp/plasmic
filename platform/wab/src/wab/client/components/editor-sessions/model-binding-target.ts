import {
  getExprTransformationBasedOnPropType,
  getExtraEnvFromPropType,
} from "@/wab/client/components/editor-sessions/binding-prop-utils";
import {
  BindingTarget,
  bindingTarget,
} from "@/wab/client/components/editor-sessions/binding-session";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { isSlotVar } from "@/wab/shared/SlotUtils";
import { getBaseVariant } from "@/wab/shared/Variants";
import { assertNever, ensure, ensureInstance } from "@/wab/shared/common";
import { inferPropTypeFromParam } from "@/wab/shared/component-props";
import {
  clone,
  code,
  createExprForDataPickerValue,
  extractValueSavedFromDataPicker,
  tryExtractJson,
  tryExtractString,
} from "@/wab/shared/core/exprs";
import {
  CustomCode,
  Expr,
  ExprText,
  ObjectPath,
  Param,
  RawText,
  TemplatedString,
  TplNode,
  Variant,
  VariantSetting,
  isKnownCustomCode,
  isKnownExpr,
  isKnownExprText,
  isKnownObjectPath,
  isKnownTplComponent,
  isKnownTplTag,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { TplVisibility, setTplVisibility } from "@/wab/shared/visibility-utils";

export type BindingField =
  | { kind: "arg"; param: Param }
  | { kind: "attr"; attr: string }
  | { kind: "text" }
  | { kind: "visibility" }
  | { kind: "collection" };

/** A model destination, independent of the sidebar and the currently targeted variants. */
export function modelBindingTarget(
  viewCtx: ViewCtx,
  tpl: TplNode,
  variants: readonly Variant[],
  field: BindingField,
): BindingTarget {
  const component = viewCtx.currentComponent();
  const combo =
    field.kind === "arg" &&
    isKnownTplComponent(tpl) &&
    isSlotVar(tpl.component, field.param.variable)
      ? [getBaseVariant(component)]
      : [...variants];
  const vtm = viewCtx.variantTplMgr();
  const context = { viewCtx, component, tpl };
  const fieldKey =
    field.kind === "arg"
      ? `arg:${field.param.uuid}`
      : field.kind === "attr"
        ? `attr:${field.attr}`
        : field.kind;
  const read = (
    vs:
      | Pick<VariantSetting, "args" | "attrs" | "text" | "dataCond" | "dataRep">
      | undefined,
  ) => {
    switch (field.kind) {
      case "arg":
        return vs?.args.find((arg) => arg.param === field.param)?.expr;
      case "attr":
        return vs?.attrs[field.attr];
      case "text":
        return vs?.text;
      case "visibility":
        return vs?.dataCond;
      case "collection":
        return vs?.dataRep?.collection;
      default:
        return assertNever(field);
    }
  };
  const identity = bindingTarget(viewCtx, tpl, combo, fieldKey, read);
  const propType = () =>
    field.kind === "arg" && isKnownTplComponent(tpl)
      ? inferPropTypeFromParam(viewCtx.studioCtx, viewCtx, tpl, field.param)
      : "string";
  const transformation = () => getExprTransformationBasedOnPropType(propType());
  const effective = () => read(vtm.effectiveVariantSetting(tpl, combo));
  const expression = (): Expr | undefined => {
    const value =
      effective() ??
      (field.kind === "arg" ? field.param.defaultExpr : undefined);
    if (field.kind === "text") {
      return isKnownExprText(value) ? value.expr : undefined;
    }
    return transformation().maybeUnwrapExpr(
      isKnownExpr(value) ? value : undefined,
    );
  };
  const fallback = () => {
    const expr = expression();
    return isKnownCustomCode(expr) || isKnownObjectPath(expr)
      ? (expr.fallback ?? undefined)
      : undefined;
  };
  const setExpression = (expr: Expr | undefined) => {
    const vs = vtm.ensureVariantSetting(tpl, combo);
    switch (field.kind) {
      case "arg": {
        const targetTpl = ensure(
          isKnownTplComponent(tpl) ? tpl : undefined,
          "Argument binding requires a component",
        );
        const wrapped = transformation().maybeWrapExpr(expr);
        if (wrapped) {
          vtm.setArgUnderVariantSetting(
            targetTpl,
            field.param.variable,
            wrapped,
            vs,
          );
        } else {
          vtm.delArgFromVariantSetting(targetTpl, field.param.variable, vs);
        }
        break;
      }
      case "attr":
        if (expr) {
          vs.attrs = { ...vs.attrs, [field.attr]: expr };
        } else {
          const { [field.attr]: _removed, ...attrs } = vs.attrs;
          vs.attrs = attrs;
        }
        break;
      case "text": {
        const text = effective();
        vs.text = new ExprText({
          expr: ensureInstance(expr, CustomCode, ObjectPath, TemplatedString),
          html: isKnownExprText(text) && text.html,
        });
        break;
      }
      case "visibility":
        setTplVisibility(tpl, combo, TplVisibility.CustomExpr);
        vs.dataCond = ensureInstance(expr, CustomCode, ObjectPath);
        break;
      case "collection":
        ensure(vs.dataRep, "The repetition was removed").collection =
          ensureInstance(expr, CustomCode, ObjectPath);
        break;
      default:
        assertNever(field);
    }
  };
  return {
    ...identity,
    exists: () =>
      identity.exists() &&
      (field.kind !== "arg" ||
        (isKnownTplComponent(tpl) &&
          tpl.component.params.includes(field.param))),
    context,
    value: () =>
      extractValueSavedFromDataPicker(expression(), {
        projectFlags: viewCtx.projectFlags(),
        component,
        inStudio: true,
      }),
    write: (value) => {
      if (!value) {
        return;
      }
      const previous = fallback();
      setExpression(
        createExprForDataPickerValue(
          value,
          field.kind === "collection"
            ? code("([])")
            : previous && clone(previous),
        ),
      );
    },
    unlink:
      field.kind === "collection"
        ? undefined
        : () => {
            const previous = fallback();
            if (field.kind === "text") {
              vtm.ensureVariantSetting(tpl, combo).text = new RawText({
                text:
                  (isKnownCustomCode(previous) && tryExtractString(previous)) ||
                  "",
                markers: [],
              });
            } else if (field.kind === "visibility") {
              setTplVisibility(
                tpl,
                combo,
                isKnownCustomCode(previous) && tryExtractJson(previous)
                  ? TplVisibility.Visible
                  : TplVisibility.NotRendered,
              );
            } else {
              const isVariantArg =
                field.kind === "arg" &&
                isKnownTplComponent(tpl) &&
                tpl.component.variantGroups.some(
                  (group) => group.param === field.param,
                );
              setExpression(
                isVariantArg && !isKnownVariantsRef(previous)
                  ? undefined
                  : previous && clone(previous),
              );
            }
          },
    data: (preview) => {
      if (!viewCtx.studioCtx.viewCtxs.includes(viewCtx)) {
        return undefined;
      }
      const env = viewCtx.getCanvasEnvForTpl(tpl, {
        anchorCloneKey: preview.cloneKey,
        ignoreFocusedCloneKey: true,
        forDataRepCollection:
          field.kind === "collection" || field.kind === "visibility",
      });
      if (
        !env ||
        field.kind !== "arg" ||
        (!isKnownTplComponent(tpl) && !isKnownTplTag(tpl))
      ) {
        return env;
      }
      const { componentPropValues, ccContextData } =
        viewCtx.getComponentEvalContext(tpl, field.param);
      return {
        ...env,
        ...getExtraEnvFromPropType(
          propType(),
          componentPropValues,
          ccContextData,
          { path: [field.param.variable.name] },
        ),
      };
    },
    schema: () => viewCtx.customFunctionsSchema(),
  };
}
