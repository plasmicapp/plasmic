import {
  getExcludedParamKindMessage,
  validatePropName,
  validatePropOptions,
  validateValueForPropType,
} from "@/wab/client/operations/utils/validate-prop-changes";
import { validateStateAccessType } from "@/wab/client/operations/utils/validate-state-changes";
import { TplMgr } from "@/wab/shared/TplMgr";
import { canRenameParam } from "@/wab/shared/core/components";
import { StateAccessType } from "@/wab/shared/core/states";
import { GenericError } from "@/wab/shared/error-handling";
import {
  Component,
  Expr,
  Param,
  isKnownPropParam,
  isKnownStateParam,
} from "@/wab/shared/model/classes";
import { isOptionsType } from "@/wab/shared/model/model-util";
import { getPropTypeDataForType } from "@/wab/shared/model/prop-type-config";
import { ChoiceOptions } from "@plasmicapp/host";
import { Result, err, ok } from "neverthrow";

export type UpdateComponentPropResult = Result<void, GenericError>;

export interface ComponentPropChanges {
  name?: string;
  options?: ChoiceOptions;
  defaultValue?: Expr | null;
  previewValue?: Expr | null;
  advanced?: boolean;
  isLocalizable?: boolean;
}

/**
 * Update fields of a prop on the component's props interface. All requested
 * changes are validated up front, so an error result means nothing was
 * changed.
 *
 * Field semantics:
 * - name: deduped rename; `$props` references are fixed up automatically.
 * - options: replaces the allowed values of a choice/multiChoice prop.
 *   If the new options would strand the stored default/preview values, the
 *   call errors unless a new defaultValue/previewValue accompanies the
 *   change. Instance args referencing removed options are left as-is
 *   (Studio lints them; it does not migrate them either).
 * - defaultValue / previewValue: any expression (build static values with
 *   `codeLit`); null clears. Statically-known values are validated against
 *   the type; dynamic expressions evaluate where the component is
 *   instantiated.
 * - advanced: hides the prop in the UI by default (plain props only).
 * - isLocalizable: includes a text prop's default value in localization
 *   extraction.
 *
 * A prop's type is immutable (matching Studio; there is no arg-migration
 * machinery). State/onChange/slot/variant-group params are not props and are
 * managed through their own operations, except the value param of a
 * read-and-write state, which doubles as a prop; its default is the state's
 * initial value and follows the state's dynamic-value rule.
 */
export function updateComponentProp(
  param: Param,
  changes: ComponentPropChanges,
  opts: {
    component: Component;
    tplMgr: TplMgr;
  }
): UpdateComponentPropResult {
  const { component, tplMgr } = opts;
  const { name, options, defaultValue, previewValue, advanced, isLocalizable } =
    changes;
  const propName = param.variable.name;

  const excludedKindMessage = getExcludedParamKindMessage(component, param);
  if (excludedKindMessage) {
    return err({ message: excludedKindMessage });
  }
  if (
    name === undefined &&
    options === undefined &&
    defaultValue === undefined &&
    previewValue === undefined &&
    advanced === undefined &&
    isLocalizable === undefined
  ) {
    return err({ message: `No changes provided for prop "${propName}".` });
  }
  if (name !== undefined) {
    const invalidNameMessage = validatePropName(name);
    if (invalidNameMessage) {
      return err({ message: invalidNameMessage });
    }
    if (!canRenameParam(component, param)) {
      return err({
        message: `Prop "${propName}" is a built-in prop of component "${component.name}" and cannot be renamed.`,
      });
    }
  }
  const propTypeData = getPropTypeDataForType(param.type);
  if (options !== undefined) {
    if (!isOptionsType(param.type)) {
      return err({
        message: `Prop "${propName}" is not a choice or multiChoice prop, so it has no options.`,
      });
    }
    const invalidOptionsMessage = validatePropOptions(options);
    if (invalidOptionsMessage) {
      return err({ message: invalidOptionsMessage });
    }
    // New options can strand the stored default/preview values; error
    // rather than silently keeping (or dropping) a value the caller did not
    // ask to change, so callers update them in the same call.
    if (defaultValue === undefined && param.defaultExpr) {
      const staleMessage = validateValueForPropType(
        "Default",
        propTypeData,
        options,
        param.defaultExpr
      );
      if (staleMessage) {
        return err({
          message: `${staleMessage} Provide defaultValue together with the new options (null unsets it).`,
        });
      }
    }
    if (previewValue === undefined && param.previewExpr) {
      const staleMessage = validateValueForPropType(
        "Preview",
        propTypeData,
        options,
        param.previewExpr
      );
      if (staleMessage) {
        return err({
          message: `${staleMessage} Provide previewValue together with the new options (null unsets it).`,
        });
      }
    }
  }
  const effectiveOptions =
    options ??
    (isOptionsType(param.type)
      ? (param.type.options as ChoiceOptions)
      : undefined);
  if (defaultValue != null) {
    const invalidMessage = validateValueForPropType(
      "Default",
      propTypeData,
      effectiveOptions,
      defaultValue
    );
    if (invalidMessage) {
      return err({ message: invalidMessage });
    }
    if (isKnownStateParam(param)) {
      // The default of a read-and-write state's value param is the state's
      // initial value, so the state's dynamic-value rule applies to it.
      const invalidStateMessage = validateStateAccessType(
        param.state.accessType as StateAccessType,
        defaultValue
      );
      if (invalidStateMessage) {
        return err({ message: invalidStateMessage });
      }
    }
  }
  if (previewValue != null) {
    const invalidMessage = validateValueForPropType(
      "Preview",
      propTypeData,
      effectiveOptions,
      previewValue
    );
    if (invalidMessage) {
      return err({ message: invalidMessage });
    }
  }

  if (name !== undefined) {
    tplMgr.renameParam(component, param, name);
  }
  if (options !== undefined && isOptionsType(param.type)) {
    param.type.options = options;
  }
  if (defaultValue !== undefined) {
    param.defaultExpr = defaultValue;
  }
  if (previewValue !== undefined) {
    param.previewExpr = previewValue;
  }
  if (advanced !== undefined && isKnownPropParam(param)) {
    param.advanced = advanced;
  }
  if (isLocalizable !== undefined) {
    param.isLocalizable = isLocalizable;
  }
  return ok(undefined);
}
