import { getComponentDisplayName } from "@/wab/shared/core/components";
import {
  findImplicitStatesOfNodesInTree,
  findImplicitUsages,
  getStateDisplayName,
  isStateUsedInExpr,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  Component,
  Site,
  TplNode,
  ensureKnownEventHandler,
  isKnownEventHandler,
  isKnownTplRef,
} from "@/wab/shared/model/classes";
import { capitalizeFirst } from "@/wab/shared/strs";
import L from "lodash";

type ComponentExtractionError = {
  message: string;
  referencingNode?: TplNode | null;
};

/**
 * Check whether `tpl` can be extracted from `containingComponent` into a new
 * component. Returns null if extraction is safe; otherwise an error with a
 * user-facing message and, when applicable, the node holding the blocking
 * reference.
 */
export function validateComponentExtraction(
  tpl: TplNode,
  containingComponent: Component,
  site: Site
): ComponentExtractionError | null {
  if (Tpls.isBodyTpl(tpl)) {
    return {
      message:
        "Page body is a special element. Choose another element to extract as a component.",
    };
  }

  if (Tpls.isTplTextBlock(tpl.parent)) {
    return {
      message:
        "Cannot extract inline text into a component. This feature is not supported at the moment.",
    };
  }

  if (!Tpls.isTplTagOrComponent(tpl) || Tpls.isTplColumn(tpl)) {
    return {
      message:
        "You can only extract tags or component instances into a new Component.",
    };
  }

  const flattenedTplsSet = new Set(Tpls.flattenTpls(tpl));

  const removedImplicitStates = new Set(
    findImplicitStatesOfNodesInTree(containingComponent, tpl)
  );
  const containingComponentExprs = Tpls.findExprsInTree(
    containingComponent.tplTree,
    [tpl]
  );
  for (const state of removedImplicitStates) {
    const refs = containingComponentExprs.filter(({ expr }) =>
      isStateUsedInExpr(state, expr)
    );
    if (refs.length > 0) {
      return {
        message: `Selected elements contain variable "${getStateDisplayName(
          state
        )}" which is referenced in the current component.`,
        referencingNode: refs.find((r) => r.node)?.node,
      };
    }
    const implicitUsages = findImplicitUsages(site, state);
    if (implicitUsages.length > 0) {
      const components = L.uniq(implicitUsages.map((usage) => usage.component));
      return {
        message: `Selected nodes contain variable "${getStateDisplayName(
          state
        )}" which is referenced in ${components
          .map((c) => getComponentDisplayName(c))
          .join(", ")}.`,
      };
    }
  }

  const tplExprs = Tpls.findExprsInTree(tpl);
  const exprsInInteractions = tplExprs
    .filter(({ expr }) => isKnownEventHandler(expr))
    .flatMap(({ expr }) => {
      const eventHandler = ensureKnownEventHandler(expr);
      return eventHandler.interactions.flatMap((interaction) =>
        Tpls.findExprsInInteraction(interaction)
      );
    });
  const remainingStates = containingComponent.states.filter(
    (s) => !removedImplicitStates.has(s)
  );
  for (const state of remainingStates) {
    // We try to extract the component if the state is not referenced in any
    // interaction. We guess that this state is read-only in this context and
    // can be passed in as a prop of the new component.
    const refsInInteractions = new Set(
      exprsInInteractions.filter((expr) => isStateUsedInExpr(state, expr))
    );
    if (refsInInteractions.size === 0) {
      continue;
    }
    const refs = tplExprs.filter(
      ({ expr }) =>
        isStateUsedInExpr(state, expr) && refsInInteractions.has(expr)
    );
    if (refs.length > 0) {
      return {
        message: `Selected elements contain reference to "${getStateDisplayName(
          state
        )}".`,
        referencingNode: refs.find((r) => r.node)?.node,
      };
    }
  }

  for (const tplRef of tplExprs) {
    const expr = tplRef.expr;
    if (isKnownTplRef(expr)) {
      if (!flattenedTplsSet.has(expr.tpl)) {
        const name = Tpls.isTplNamable(expr.tpl) ? expr.tpl.name : undefined;
        return {
          message: `Selected elements contain reference to "${
            name ?? capitalizeFirst(Tpls.summarizeTpl(expr.tpl))
          }".`,
          referencingNode: tplRef.node ?? null,
        };
      }
    }
  }

  return null;
}
