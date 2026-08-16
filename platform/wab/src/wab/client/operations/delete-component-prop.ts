import { getExcludedParamKindMessage } from "@/wab/client/operations/utils/validate-prop-changes";
import {
  canDeleteParam,
  removeComponentParam,
} from "@/wab/shared/core/components";
import { isOnChangeParam } from "@/wab/shared/core/states";
import { findExprsInComponent } from "@/wab/shared/core/tpls";
import { GenericError } from "@/wab/shared/error-handling";
import {
  Component,
  Param,
  Site,
  isKnownStateParam,
} from "@/wab/shared/model/classes";
import { isParamUsedInExpr } from "@/wab/shared/refactoring";
import { Result, err, ok } from "neverthrow";

export type DeleteComponentPropResult = Result<void, GenericError>;

/**
 * Delete a prop from the component's props interface. Errors if the prop is
 * still referenced in the component's expressions instead of cascading
 * (Studio instead confirms and then nulls the references). Args passed by
 * instances are not a blocker: removing the prop strips them, which is the
 * expected effect of deleting a prop. State/onChange/slot/variant-group
 * params are not props and are managed through their own operations; Plume
 * built-in props cannot be deleted.
 */
export function deleteComponentProp(
  param: Param,
  opts: {
    site: Site;
    component: Component;
  }
): DeleteComponentPropResult {
  const { site, component } = opts;
  const propName = param.variable.name;

  const excludedKindMessage = getExcludedParamKindMessage(component, param);
  if (excludedKindMessage) {
    return err({ message: excludedKindMessage });
  }
  if (!canDeleteParam(component, param)) {
    return err({
      message:
        isKnownStateParam(param) || isOnChangeParam(param, component)
          ? `Prop "${propName}" is linked to a state; manage it through state operations.`
          : `Prop "${propName}" is a built-in prop of component "${component.name}" and cannot be deleted.`,
    });
  }

  const refs = findExprsInComponent(component).filter(({ expr }) =>
    isParamUsedInExpr(param, expr)
  );
  if (refs.length > 0) {
    return err({
      message: `Cannot delete prop "${propName}": it is referenced in component "${component.name}".`,
    });
  }

  removeComponentParam(site, component, param);
  return ok(undefined);
}
