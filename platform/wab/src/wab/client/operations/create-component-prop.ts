import {
  validatePropName,
  validatePropOptions,
  validateValueForPropType,
} from "@/wab/client/operations/utils/validate-prop-changes";
import { TplMgr } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { GenericError } from "@/wab/shared/error-handling";
import {
  Component,
  Expr,
  Param,
  PropParam,
  isKnownRenderFuncType,
  isKnownRenderableType,
} from "@/wab/shared/model/classes";
import { isOptionsType } from "@/wab/shared/model/model-util";
import { getPropTypeDataForType } from "@/wab/shared/model/prop-type-config";
import { ChoiceOptions } from "@plasmicapp/host";
import { Result, err, ok } from "neverthrow";

export type CreateComponentPropResult = Result<PropParam, GenericError>;

/**
 * Create a prop on the component's props interface. The name is deduped
 * against existing param/tpl names (numeric suffix). `type` is a wab type
 * built by the caller (e.g. with `mkWabTypeForPropKind`); slot types are
 * not props. Default and preview values are any expression (build static
 * values with `codeLit`); statically-known values are validated against the
 * type, and dynamic expressions evaluate where the component is
 * instantiated.
 */
export function createComponentProp(opts: {
  component: Component;
  tplMgr: TplMgr;
  name: string;
  type: Param["type"];
  defaultValue?: Expr | null;
  previewValue?: Expr | null;
  advanced?: boolean;
  isLocalizable?: boolean;
}): CreateComponentPropResult {
  const { component, tplMgr, type, defaultValue, previewValue } = opts;

  if (isCodeComponent(component)) {
    return err({
      message: `Component "${component.name}" is a code component; its props are managed by its code registration.`,
    });
  }
  const invalidNameMessage = validatePropName(opts.name);
  if (invalidNameMessage) {
    return err({ message: invalidNameMessage });
  }
  assert(
    !isKnownRenderableType(type) && !isKnownRenderFuncType(type),
    () => `Didn't expect slot type`
  );
  const options = isOptionsType(type)
    ? (type.options as ChoiceOptions)
    : undefined;
  if (options) {
    const invalidOptionsMessage = validatePropOptions(options);
    if (invalidOptionsMessage) {
      return err({ message: invalidOptionsMessage });
    }
  }
  const propTypeData = getPropTypeDataForType(type);
  if (defaultValue != null) {
    const invalidMessage = validateValueForPropType(
      "Default",
      propTypeData,
      options,
      defaultValue
    );
    if (invalidMessage) {
      return err({ message: invalidMessage });
    }
  }
  if (previewValue != null) {
    const invalidMessage = validateValueForPropType(
      "Preview",
      propTypeData,
      options,
      previewValue
    );
    if (invalidMessage) {
      return err({ message: invalidMessage });
    }
  }

  const name = tplMgr.getUniqueParamName(component, opts.name);
  const param = mkParam({
    name,
    type,
    paramType: "prop",
    description: "metaProp",
    defaultExpr: defaultValue ?? undefined,
    previewExpr: previewValue ?? undefined,
    advanced: opts.advanced ?? false,
    isLocalizable: opts.isLocalizable ?? false,
  });
  component.params.push(param);
  return ok(param);
}
