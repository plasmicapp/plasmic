import { assert, isNonNil } from "@/wab/shared/common";
import { removeFromArray } from "@/wab/commons/collections";
import { componentToDeepReferenced } from "@/wab/shared/cached-selectors";
import {
  Component,
  isKnownCustomCode,
  isKnownObjectPath,
  isKnownRenderExpr,
  isKnownStateParam,
  isKnownVariantsRef,
  Param,
  Site,
  State,
  TplComponent,
  TplNode,
  Variant,
  VariantsRef,
} from "@/wab/shared/model/classes";
import { wabToTsType } from "@/wab/shared/model/model-util";
import { isSlot } from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { UserError } from "@/wab/shared/UserError";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import {
  ensureCorrectImplicitStates,
  isPublicState,
  removeComponentState,
} from "@/wab/shared/core/states";
import { isTplComponent } from "@/wab/shared/core/tpls";
import { ensureOnlyValidInteractiveVariantsInComponent } from "@/wab/shared/code-components/interaction-variants";

export function makeComponentSwapper(
  site: Site,
  fromComp: Component,
  toComp: Component
) {
  if (componentToDeepReferenced(toComp).has(fromComp)) {
    throw new UserError(
      `Cannot replace components`,
      `Component "${toComp.name}" is using instances of component "${fromComp.name}"; swapping would lead to component cycles.`
    );
  }

  const getParamType = (comp: Component, param: Param) => {
    const vg = comp.variantGroups.find((g) => g.param === param);
    if (vg) {
      if (isStandaloneVariantGroup(vg)) {
        return "toggle-group";
      } else if (vg.multi) {
        return "multi-group";
      } else {
        return "single-group";
      }
    } else if (isSlot(param)) {
      return "slot";
    } else {
      return wabToTsType(param.type);
    }
  };

  const paramMap = new Map<Param, Param>();
  for (const fromParam of fromComp.params) {
    const fromParamType = getParamType(fromComp, fromParam);
    const toParam = toComp.params.find(
      (p) => p.variable.name === fromParam.variable.name
    );
    if (toParam && fromParamType === getParamType(toComp, toParam)) {
      // Only allow this mapping if the param type matches
      paramMap.set(fromParam, toParam);
    }
  }

  const publicStateMap = new Map<State, State>();
  for (const fromState of fromComp.states) {
    // We only attempt to preserve public explicit states
    if (isPublicState(fromState) && !fromState.implicitState) {
      const toState = toComp.states.find(
        (s) => s.param.variable.name === fromState.param.variable.name
      );
      if (
        toState &&
        isPublicState(toState) &&
        !toState.implicitState &&
        toState.variableType === fromState.variableType &&
        fromState.onChangeParam.variable.name ===
          toState.onChangeParam.variable.name
      ) {
        publicStateMap.set(fromState, toState);
      }
    }
  }

  const variantMap = new Map<Variant, Variant>();
  for (const fromGroup of fromComp.variantGroups) {
    const toGroup = toComp.variantGroups.find(
      (g) => g.param.variable.name === fromGroup.param.variable.name
    );
    if (!toGroup) {
      continue;
    }

    for (const fromVariant of fromGroup.variants) {
      const toVariant = toGroup.variants.find(
        (v) => v.name === fromVariant.name
      );
      if (toVariant) {
        variantMap.set(fromVariant, toVariant);
      }
    }
  }

  const toVariantGroupParams = new Set(
    toComp.variantGroups.map((g) => g.param)
  );

  const swapTplComponent = (tpl: TplComponent, owner: Component) => {
    assert(
      tpl.component === fromComp,
      "Expected tpl to be a tpl component of fromComp"
    );
    for (const vs of tpl.vsettings) {
      for (const arg of [...vs.args]) {
        const toParam = paramMap.get(arg.param);
        if (!toParam) {
          // No corresponding param!  Removing this arg
          if (isKnownRenderExpr(arg.expr)) {
            // carefully detach tpl tree in the arg, if this was
            // a slot arg
            $$$(arg.expr.tpl).remove({ deep: true });
          }
          removeFromArray(vs.args, arg);
        } else if (
          isKnownStateParam(toParam) &&
          toVariantGroupParams.has(toParam)
        ) {
          const fixVariantsRef = (expr: VariantsRef) => {
            const fromVariants = expr.variants;
            const toVariants = fromVariants
              .map((v) => variantMap.get(v))
              .filter(isNonNil);
            expr.variants = toVariants;
            arg.param = toParam;
          };
          // A variants arg; map to new variants if we have a variants ref
          if (isKnownVariantsRef(arg.expr)) {
            fixVariantsRef(arg.expr);
          } else if (
            isKnownCustomCode(arg.expr) ||
            isKnownObjectPath(arg.expr)
          ) {
            // If we have a custom code we assume it's an expression that properly
            // matches to the new variants
            arg.param = toParam;
            // If arg.expr is a CustomCode/ObjectPath it means that we might need to fix
            // the fallback expr.
            if (isKnownVariantsRef(arg.expr.fallback)) {
              fixVariantsRef(arg.expr.fallback);
            }
          } else {
            assert(false, "Unexpected variants arg");
          }
        } else {
          // Pray for the best
          arg.param = toParam;
        }
      }
    }

    tpl.component = toComp;

    // Now we need to fix up the implicit states
    const tplStates = owner.states.filter((s) => s.tplNode === tpl);
    for (const tplState of tplStates) {
      if (tplState.implicitState) {
        if (publicStateMap.has(tplState.implicitState)) {
          // We've found a compatible matching state for the toComp,
          // so we swap out the implicitState reference here
          tplState.implicitState = publicStateMap.get(tplState.implicitState);
        } else {
          // No matching state, so we remove the implicit state
          // from the owning component
          removeComponentState(site, owner, tplState);
        }
      }
    }

    // Finally, we make sure we create the implicit states we should have
    ensureCorrectImplicitStates(site, owner, tpl);

    // If we are changing the root component, we ensure that the interaction variants
    // are valid
    if (!tpl.parent) {
      ensureOnlyValidInteractiveVariantsInComponent(site, owner);
    }
  };

  return (tpl: TplNode, owner: Component) => {
    if (isTplComponent(tpl) && tpl.component === fromComp) {
      swapTplComponent(tpl, owner);
    }
  };
}
