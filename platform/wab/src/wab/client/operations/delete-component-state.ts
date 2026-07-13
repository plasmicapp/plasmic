import {
  canDeleteState,
  getComponentDisplayName,
  isCodeComponent,
} from "@/wab/shared/core/components";
import {
  findImplicitUsages,
  getStateVarName,
  isStateUsedInExpr,
  removeComponentState,
} from "@/wab/shared/core/states";
import { findExprsInComponent } from "@/wab/shared/core/tpls";
import {
  Component,
  Site,
  State,
  TplNode,
  isKnownVariantGroupState,
} from "@/wab/shared/model/classes";
import { uniq } from "lodash";

export type DeleteComponentStateResult =
  | { result: "success" }
  | {
      result: "error";
      message: string;
      /**
       * The TplNode holding an expression that references the state,
       * preventing deletion. Present only for references within the
       * state's own component. Used to render a clickable
       * "Go to reference" link in the error notification.
       */
      referencingNode?: TplNode | null;
    };

/**
 * Delete a state variable, removing both of its params. Errors if the state
 * is still referenced (in this component's expressions, or in other
 * components through implicit copies) instead of cascading, and if the state
 * is not user-deletable (implicit copy of a child component's state,
 * variant-group-backed, or Plume built-in).
 */
export function deleteComponentState(
  state: State,
  opts: {
    site: Site;
    component: Component;
  }
): DeleteComponentStateResult {
  const { site, component } = opts;
  const stateName = getStateVarName(state);

  if (isCodeComponent(component)) {
    return {
      result: "error",
      message: `Component "${component.name}" is a code component; its states are managed by its code registration.`,
    };
  }
  if (state.implicitState) {
    return {
      result: "error",
      message: `State "${stateName}" is an implicit state; it can only be removed by deleting its element.`,
    };
  }
  if (isKnownVariantGroupState(state)) {
    return {
      result: "error",
      message: `State "${stateName}" backs a variant group; delete the variant group instead.`,
    };
  }
  if (!canDeleteState(component, state)) {
    return {
      result: "error",
      message: `State "${stateName}" is a built-in state of component "${component.name}" and cannot be deleted.`,
    };
  }

  const refs = findExprsInComponent(component).filter(({ expr }) =>
    isStateUsedInExpr(state, expr)
  );
  if (refs.length > 0) {
    return {
      result: "error",
      message: `Cannot delete state "${stateName}": it is referenced in component "${component.name}".`,
      referencingNode: refs.find((r) => r.node)?.node,
    };
  }
  const referencingComponents = uniq(
    findImplicitUsages(site, state).map((usage) => usage.component)
  );
  if (referencingComponents.length > 0) {
    return {
      result: "error",
      message: `Cannot delete state "${stateName}": it is referenced in ${referencingComponents
        .map((c) => getComponentDisplayName(c))
        .join(", ")}.`,
    };
  }

  removeComponentState(site, component, state);
  return { result: "success" };
}
