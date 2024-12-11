import { isTokenRef, tryParseTokenRef } from "@/wab/commons/StyleToken";
import * as cssPegParser from "@/wab/gen/cssPegParser";
import { AnyArena, getArenaFrames, isMixedArena } from "@/wab/shared/Arenas";
import { MIXIN_LOWER } from "@/wab/shared/Labels";
import { getTplSlot, isSlot } from "@/wab/shared/SlotUtils";
import {
  isBaseRuleVariant,
  isBaseVariant,
  isComponentStyleVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isStyleOrCodeComponentVariant,
  splitVariantCombo,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";
import {
  componentToUsedImageAssets,
  componentToUsedMixins,
  componentToUsedTokens,
  flattenComponent,
} from "@/wab/shared/cached-selectors";
import {
  describeValueOrType,
  ensure,
  partitions,
  pathGet,
} from "@/wab/shared/common";
import {
  ContextCodeComponent,
  allComponentVariants,
  getComponentDisplayName,
  isCodeComponent,
  isContextCodeComponent,
  isFrameComponent,
  isPageComponent,
  isPlasmicComponent,
  isPlumeComponent,
  tryGetVariantGroupValueFromArg,
} from "@/wab/shared/core/components";
import { ParamExportType } from "@/wab/shared/core/lang";
import { ImportableObject } from "@/wab/shared/core/project-deps";
import {
  allComponents,
  allGlobalVariants,
  allImageAssets,
  allMixins,
  allStyleTokens,
  getSiteArenas,
} from "@/wab/shared/core/sites";
import { isPrivateState } from "@/wab/shared/core/states";
import { isValidStyleProp } from "@/wab/shared/core/style-props";
import { parseCssValue } from "@/wab/shared/core/styles";
import {
  ancestorsUp,
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplVariantable,
  tplChildren,
} from "@/wab/shared/core/tpls";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  ArenaFrame,
  Component,
  Site,
  StyleToken,
  TplNode,
  Variant,
  isKnownArenaFrame,
  isKnownRenderExpr,
  isKnownStateChangeHandlerParam,
  isKnownStateParam,
  isKnownVarRef,
  isKnownVariantGroupState,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import {
  createNodeCtx,
  walkModelTree,
} from "@/wab/shared/model/model-tree-util";
import { modelConflictsMeta } from "@/wab/shared/site-diffs/model-conflicts-meta";
import * as Sentry from "@sentry/browser";
import L, { uniqBy } from "lodash";

export class InvariantError extends Error {
  constructor(message: string, public data?: any) {
    super(`Cannot save project - ${message}`);
    debugger;
  }
}

export function assertSiteInvariants(site: Site) {
  const errors: InvariantError[] = Array.from(genSiteErrors(site));
  if (errors.length > 0) {
    console.error("Site invariant errors", errors);
    throw errors[0];
  }
}

export function* genSiteErrors(site: Site) {
  const componentNames = new Set<string>();
  componentToVariants = new WeakMap();
  siteToGlobalVariants = new WeakMap();
  siteToValidRefs = new WeakMap();
  for (const component of site.components) {
    yield* genComponentErrors(site, component);
    // Only count Plasmic components that are not sub components
    if (!isPlasmicComponent(component) || component.superComp) {
      continue;
    }
    if (componentNames.has(component.name)) {
      Sentry.captureException(
        new InvariantError(`Duplicated component name: ${component.name}`)
      );
    } else {
      componentNames.add(component.name);
    }
  }

  yield* genGlobalContextErrors(site);

  for (const arena of getSiteArenas(site)) {
    for (const frame of getArenaFrames(arena)) {
      if (isKnownArenaFrame(frame)) {
        yield* genFrameErrors(site, arena, frame);
      }
    }
  }

  const allTokens = allStyleTokens(site, { includeDeps: "all" });
  for (const token of site.styleTokens) {
    yield* genStyleTokenErrors(site, token, allTokens);
  }

  genGenericModelErrors(site);
}

function* genGenericModelErrors(site: Site) {
  const insts = walkModelTree(createNodeCtx(site));
  for (const inst of insts) {
    const cls = instUtil.getInstClass(inst);
    for (const field of meta.allFields(cls)) {
      const conflictsMeta = modelConflictsMeta[cls.name][field.name];
      if (conflictsMeta?.arrayType) {
        const vals = inst[field.name] ?? [];
        switch (conflictsMeta.conflictType) {
          case "rename": {
            const names = new Set(
              vals.map((val) => pathGet(val, conflictsMeta.nameKey.split(".")))
            );
            if (names.size < vals.length) {
              yield new InvariantError(
                `Field ${field.name} has duplicate names: ${names}`
              );
            }
            break;
          }
          case "merge": {
            const keys = new Set(
              vals.map((val) =>
                conflictsMeta.mergeKeyIsIdentity
                  ? val
                  : conflictsMeta.mergeKey
                  ? pathGet(val, conflictsMeta.mergeKey.split("."))
                  : conflictsMeta.mergeKeyFn(val)
              )
            );
            if (keys.size < vals.length) {
              yield new InvariantError(
                `Field ${field.name} has duplicate merge-key: ${keys}`
              );
            }
            break;
          }
        }
      }
    }
  }
}

const genStyleTokenErrors = maybeComputedFn(
  (site: Site, token: StyleToken, allTokens: StyleToken[]) =>
    Array.from(_genStyleTokenErrors(site, token, allTokens))
);

function* _genStyleTokenErrors(
  site: Site,
  token: StyleToken,
  allTokens: StyleToken[]
) {
  const tokenRefs = [
    token.value,
    ...token.variantedValues.map((variantedValue) => variantedValue.value),
  ].filter((tok) => isTokenRef(tok));
  for (const tokenRef of tokenRefs) {
    if (!tryParseTokenRef(tokenRef, allTokens)) {
      yield new InvariantError(
        `Token ${token.name} references an unexisting token: ${tokenRef}`
      );
    }
  }
}

const genComponentErrors = maybeComputedFn((site: Site, component: Component) =>
  Array.from(_genComponentErrors(site, component))
);

function* _genComponentErrors(site: Site, component: Component) {
  if (isCodeComponent(component)) {
    const root = component.tplTree;

    if (!isTplTag(root) || root.tag !== "div") {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )}'s root node is not a div tag`,
        { site, component }
      );
    } else {
      if (root.locked) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(
            component
          )}'s root node cannot be locked`,
          { site, component }
        );
      }
      for (const child of root.children) {
        if (!isTplSlot(child)) {
          yield new InvariantError(
            `Component ${getComponentDisplayName(
              component
            )}'s cannot contain non slot direct child`,
            { site, component }
          );
        }
      }
    }
  }

  if (isFrameComponent(component)) {
    const frames = getSiteArenas(site).flatMap((arena) =>
      getArenaFrames(arena)
    );
    if (!frames.find((f) => f.container.component === component)) {
      yield new InvariantError(`Frame component has no arena frame`, {
        site,
        component,
      });
    }
  }

  if (isPageComponent(component)) {
    if (component.subComps.length > 0) {
      yield new InvariantError(
        `Page ${getComponentDisplayName(
          component
        )} cannot contain sub components`,
        { site, component }
      );
    }
    if (component.superComp) {
      yield new InvariantError(
        `Page ${getComponentDisplayName(
          component
        )} cannot have a super component`,
        { site, component }
      );
    }
  }

  if (component.superComp) {
    if (!site.components.includes(component.superComp)) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )} has dangling reference to superComp ${component.superComp.name}`,
        { site, component }
      );
    }
    if (!component.superComp.subComps.includes(component)) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(component)} has superComp ${
          component.superComp.name
        } which does not reference it back`,
        { site, component }
      );
    }
  }

  if (component.subComps.length > 0) {
    for (const subComp of component.subComps) {
      if (!site.components.includes(subComp)) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(
            component
          )} has dangling reference to subComp ${subComp.name}`,
          { site, component, subComp }
        );
      }
      if (subComp.superComp !== component) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(component)} has subComp ${
            subComp.name
          } which does not reference it back`,
          { site, component, subComp }
        );
      }
    }
  }

  if (component.tplTree.parent !== null) {
    yield new InvariantError(
      `Component ${getComponentDisplayName(
        component
      )}'s root node has a non null parent`,
      { site, component }
    );
  }

  if (component.variants.length === 0) {
    yield new InvariantError(
      `Component ${getComponentDisplayName(component)} has no base variant`,
      { site, component }
    );
  } else if (!isBaseVariant(component.variants[0])) {
    yield new InvariantError(
      `Component ${getComponentDisplayName(
        component
      )} does not have the base variant as its first variant`,
      { site, component }
    );
  }

  const seenTplUuids = new Set<string>();

  // Check that all children tpl nodes are valid
  for (const tpl of flattenComponent(component)) {
    if (seenTplUuids.has(tpl.uuid)) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )} has a tpl with duplicate id ${tpl.uuid}`,
        { site, component, tpl }
      );
    }
    seenTplUuids.add(tpl.uuid);

    yield* genTplErrors(site, component, tpl);
  }

  // Check that all slot params have a corresponding TplSlot
  for (const param of component.params) {
    if (isSlot(param)) {
      const slot = getTplSlot(component, param.variable);
      if (!slot) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(component)} has slot param ${
            param.variable.name
          } with no corresponding TplSlot`,
          { site, component, param }
        );
      }
      if (slot !== param.tplSlot || slot.param !== param) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(component)} has slot param ${
            param.variable.name
          } whose TplSlot doesn't point back`,
          { site, component, param }
        );
      }
    }
  }

  // Check that variant groups have linked states pointing to the corresponding param.
  for (const vg of component.variantGroups) {
    const vgName = vg.param.variable.name;
    if (vg.linkedState) {
      if (vg.linkedState.param !== vg.param) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(
            component
          )} has variant group "${vgName}" linking to state with a different param`,
          { site, component, vg }
        );
      }
      if (vg.linkedState.variantGroup !== vg) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(
            component
          )} has variant group "${vgName}" whose state doesn't point back`
        );
      }
    } else {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )} has variant group "${vgName}" with no linked state`,
        { site, component, vg }
      );
    }
  }

  // Check that non-implicit "variant" states are linked to variant groups.
  for (const state of component.states) {
    if (!state.implicitState && state.variableType === "variant") {
      if (!isKnownVariantGroupState(state)) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(component)} has variant state "${
            state.param.variable.name
          }" not pointing to the corresponding variant group`
        );
      }
      const maybeGroup = component.variantGroups.find(
        (vg) => vg.linkedState === state
      );
      if (!maybeGroup) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(component)} has variant state "${
            state.param.variable.name
          }" with no correspondent variant group`
        );
      } else if (maybeGroup.linkedState !== state) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(component)} has variant state "${
            state.param.variable.name
          }" whose variant group doesn't point back`
        );
      }
    }
  }

  // Check that implicit states indeed actually belong to their
  // owning component
  for (const state of component.states) {
    if (state.implicitState && state.tplNode && isTplComponent(state.tplNode)) {
      if (!state.tplNode.component.states.includes(state.implicitState)) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(
            component
          )} has an implicit state ${getComponentDisplayName(
            state.tplNode.component
          )}.${
            state.implicitState.param.variable.name
          } which doesn't actually exist`
        );
      }
    }
  }

  // Check that states and params are pointing to each other
  for (const state of component.states) {
    if (state.param.state !== state) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(component)} has state "${
          state.param.variable.name
        }" whose param doesn't point back`
      );
    }
    if (!isCodeComponent(component) && !isPlumeComponent(component)) {
      if (isKnownStateChangeHandlerParam(state.onChangeParam)) {
        if (state.onChangeParam.state !== state) {
          yield new InvariantError(
            `Component ${getComponentDisplayName(component)} has state "${
              state.param.variable.name
            }" whose onChange param doesn't point back`
          );
        }
      } else {
        yield new InvariantError(
          `Component ${getComponentDisplayName(component)} has state "${
            state.param.variable.name
          }" whose onChange param is not a StateChangeHandlerParam`
        );
      }
    }
  }
  for (const param of component.params) {
    if (isKnownStateParam(param) && param.state.param !== param) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(component)} has param "${
          param.variable.name
        }" whose state doesn't point back`
      );
    }
    if (
      isKnownStateChangeHandlerParam(param) &&
      param.state.onChangeParam !== param
    ) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )} has state change handler param "${
          param.variable.name
        }" whose state doesn't point back`
      );
    }
    if (
      isKnownStateChangeHandlerParam(param) &&
      !!isPrivateState(param.state) !==
        (param.exportType === ParamExportType.ToolsOnly)
    ) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )} has state change handler param "${
          param.variable.name
        }" whose state is ${param.state.accessType} but has exportType "${
          param.exportType
        }"`
      );
    }
  }

  const validRefs = getValidRefs(site);

  const refTokens = componentToUsedTokens(site, component);
  for (const token of refTokens) {
    if (!validRefs.has(token)) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )} references an invalid token ${token.name}`,
        { site, component, token }
      );
    }
  }

  const refMixins = componentToUsedMixins(component);
  for (const mixin of refMixins) {
    if (!validRefs.has(mixin)) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )} references an invalid ${MIXIN_LOWER} ${mixin.name}`,
        { site, component, mixin }
      );
    }
  }

  const refAssets = componentToUsedImageAssets(site, component);
  for (const asset of refAssets) {
    if (!validRefs.has(asset)) {
      yield new InvariantError(
        `Component ${getComponentDisplayName(
          component
        )} references an invalid asset ${asset.name}`,
        { site, component, asset }
      );
    }
  }
}

export const isInvalidDimValue = (v: string) => {
  return (
    v.startsWith("NaN") ||
    v.startsWith("-NaN") ||
    v.startsWith("Infinity") ||
    v.startsWith("-Infinity") ||
    v === "undefinedpx"
  );
};

const genTplErrors = maybeComputedFn(
  (site: Site, component: Component, tpl: TplNode) =>
    Array.from(_genTplErrors(site, component, tpl))
);

function getTplName(tpl: TplNode | undefined | null) {
  if (!tpl) {
    return `undefined`;
  } else if (isTplTag(tpl)) {
    return `TplTag[${tpl.uuid}, tag=${tpl.tag}]`;
  } else if (isTplComponent(tpl)) {
    return `TplComponent[${tpl.uuid}, comp=${getComponentDisplayName(
      tpl.component
    )}]`;
  } else if (isTplSlot(tpl)) {
    return `TplSlot([${tpl.uuid}, slot=${tpl.param.variable.name}])`;
  } else {
    return `Tpl[${(tpl as any).uuid}]`;
  }
}

function* _genTplErrors(site: Site, component: Component, tpl: TplNode) {
  const tplName = `${getTplName(tpl)} of Component ${getComponentDisplayName(
    component
  )}`;

  tplChildren(tpl).forEach((child, i) => {
    if (child.parent !== tpl) {
      throw new InvariantError(
        `${tplName} has child #${i} (${getTplName(
          child
        )}) whose parent pointer doesn't point back; instead it points to ${getTplName(
          child.parent
        )}`,
        { site, tpl, component, child }
      );
    }
  });

  if (isTplVariantable(tpl)) {
    // Check that variants referenced by vsettings are all valid
    for (const vs of tpl.vsettings) {
      const [globals, locals] = splitVariantCombo(vs.variants);
      for (const variant of globals) {
        if (!getGlobalVariants(site).includes(variant)) {
          yield new InvariantError(
            `${tplName} references non-existent global variant ${variant.name}`,
            { site, tpl, component, variant }
          );
        }
      }
      for (const variant of locals) {
        if (!getComponentVariants(component).includes(variant)) {
          yield new InvariantError(
            `${tplName} references non-existent component variant ${variant.name}`,
            { site, tpl, component, variant }
          );
        }
      }
      for (const arg of vs.args) {
        if (isTplComponent(tpl) && !tpl.component.params.includes(arg.param)) {
          yield new InvariantError(
            `${tplName}'s ${arg.param.variable.name} referencing non-existing param for component ${tpl.component.name}`,
            { site, tpl, arg }
          );
        }
        if (isSlot(arg.param)) {
          if (arg.expr && !isKnownRenderExpr(arg.expr)) {
            yield new InvariantError(
              `${tplName}'s ${
                arg.param.variable.name
              } argument has wrong type - expected renderable, but got ${describeValueOrType(
                arg.expr
              )}`
            );
          }
        } else if (arg.expr && isKnownRenderExpr(arg.expr)) {
          yield new InvariantError(
            `${tplName}'s ${
              arg.param.variable.name
            } argument has wrong type - expected ${
              arg.param.type.name
            }, but got ${describeValueOrType(arg.expr)}`
          );
        }
      }
    }
    const tplCombos = tpl.vsettings.map((vs) => vs.variants);
    if (!tplCombos.some((c) => isBaseVariant(c))) {
      yield new InvariantError(`${tplName} has no base variant settings`, {
        site,
        component,
        tpl,
      });
    }

    for (const vs of tpl.vsettings) {
      const rsChildrenSet = new Set<string>();
      const duplicatedProps: string[] = [];
      for (const sty of Object.keys(vs.rs.values)) {
        const val = vs.rs.values[sty];
        if (!isValidStyleProp(sty)) {
          yield new InvariantError(`${tplName} has bad style prop ${sty}`);
        }
        if (rsChildrenSet.has(sty)) {
          duplicatedProps.push(sty);
        }
        rsChildrenSet.add(sty);
        if (
          [
            "left",
            "right",
            "top",
            "bottom",
            "width",
            "height",
            "margin-left",
            "margin-top",
            "margin-right",
            "martin-bottom",
            "border-top-left-radius",
            "border-top-right-radius",
            "border-bottom-left-radius",
            "border-bottom-right-radius",
          ].includes(sty) &&
          isInvalidDimValue(val)
        ) {
          yield new InvariantError(
            `${tplName}'s property ${sty} has bad value: ${val}`
          );
        }
        if (sty.startsWith("background-")) {
          yield new InvariantError(
            `${tplName} has old background property ${sty}; Should be using new background system`
          );
        }
        if (sty === "background") {
          try {
            parseCssValue("background", val).forEach((v) =>
              cssPegParser.parse(v, { startRule: "backgroundLayer" })
            );
          } catch (err) {
            yield new InvariantError(
              "Failed to parse background: " + err.message
            );
          }
        }
      }

      if (duplicatedProps.length > 0) {
        yield new InvariantError(
          `${tplName} has duplicated style props: ` + duplicatedProps.join(", ")
        );
      }

      if (!isBaseVariant(vs.variants)) {
        const [privates, locals] = partitions(vs.variants, [
          isPrivateStyleVariant,
          (v) => !isGlobalVariant(v),
        ]);
        if (vs.variants.length === 0) {
          yield new InvariantError(
            `${tplName} has variant settings referencing targeting no variants`,
            {
              tpl,
              vs,
            }
          );
        }
        if (
          !isBaseVariant(vs.variants) &&
          vs.variants.some((v) => isBaseVariant(v))
        ) {
          // base variant is only allowed when it is the only variant
          yield new InvariantError(
            `${tplName} targets variant combo that includes the base variant`,
            { tpl, vs }
          );
        }
        if (privates.some((v) => v.forTpl !== tpl)) {
          yield new InvariantError(
            `${tplName} has variant settings referencing private variant for another node`,
            {
              tpl,
              vs,
            }
          );
        }
        if (privates.length > 1) {
          yield new InvariantError(
            `${tplName} targets variant combo with multiple private variants`,
            { tpl, vs }
          );
        }
        const styleVariants = locals.filter(isComponentStyleVariant);
        if (styleVariants.length > 1) {
          yield new InvariantError(
            `${tplName} targets variant combo with multiple style variants`,
            { tpl, vs }
          );
        }
      }

      // The check for base rule variant setting is similar to what we do
      // in ensureBaseRuleVariantSetting(), but we just check instead of
      // actually creating a base rule vs in case it does not exist.
      if (vs.variants.some((v) => !isBaseRuleVariant(v))) {
        const baseRuleVariants = vs.variants.filter((v) =>
          isBaseRuleVariant(v)
        );
        const baseRuleVs = tryGetVariantSetting(tpl, baseRuleVariants);
        if (!baseRuleVs) {
          yield new InvariantError(
            `${tplName} has variant setting with no corresponding base rule variant setting`,
            { tpl, vs }
          );
        }

        if (isTplVariantable(component.tplTree)) {
          const rootTplVariants = vs.variants.filter(
            (v) => !isStyleOrCodeComponentVariant(v) && !isScreenVariant(v)
          );
          const rootTplVs = tryGetVariantSetting(
            component.tplTree,
            rootTplVariants
          );
          if (!rootTplVs) {
            yield new InvariantError(
              `Component root does not have base rule variant setting corresponding to a variant setting of ${tplName}`,
              { tpl, vs }
            );
          }
        }
      }
    }
  }

  if (isTplSlot(tpl)) {
    // Check that TplSlot references a real param
    if (!component.params.includes(tpl.param)) {
      yield new InvariantError(
        `${tplName} is a TplSlot for a missing param ${tpl.param.variable.name}`,
        { site, component, tpl }
      );

      if (tpl.param.tplSlot !== tpl) {
        yield new InvariantError(
          `Component ${getComponentDisplayName(
            component
          )} has TplSlot ${tplName} whose SlotParam doesn't point back`,
          { site, component, tpl }
        );
      }
    }

    // Check for nested TplSlots
    const ancestorSlot = ancestorsUp(tpl).slice(1).find(isTplSlot);
    if (ancestorSlot) {
      yield new InvariantError(
        `${tplName} is a TplSlot that is the default contents of another TplSlot`,
        { site, component, tpl, ancestorSlot }
      );
    }
  }

  if (isTplTag(tpl)) {
    // Check that all attrs reference real params
    for (const vs of tpl.vsettings) {
      for (const [key, expr] of Object.entries(vs.attrs)) {
        if (
          isKnownVarRef(expr) &&
          !component.params.map((p) => p.variable).includes(expr.variable)
        ) {
          yield new InvariantError(
            `${tplName} has attr ${key} referencing missing param ${expr.variable.name}`,
            { site, component, tpl, key, expr }
          );
        }
      }
    }
  }

  if (isTplComponent(tpl)) {
    // Check that its component is owned by this site or its direct deps
    if (!getValidRefs(site).has(tpl.component)) {
      yield new InvariantError(
        `${tplName} is an instance of ${getComponentDisplayName(
          tpl.component
        )} which is not owned by this site or its direct deps`,
        { site, tpl, component }
      );
    }

    // No Global Context should be in the real tree
    if (isContextCodeComponent(tpl.component)) {
      yield new InvariantError(
        `${tplName} is an instance of ${getComponentDisplayName(
          tpl.component
        )} which is a global context and should not be on the tpl tree`,
        { site, tpl, component }
      );
    }

    // Check that all args reference real params
    for (const vs of tpl.vsettings) {
      const isBase = isBaseVariant(vs.variants);
      for (const arg of vs.args) {
        if (!isBase && isSlot(arg.param)) {
          yield new InvariantError(
            `${tplName} has slot arg for a non-base vsetting`,
            { site, component, tpl, vs, arg }
          );
        }
        if (!tpl.component.params.includes(arg.param)) {
          yield new InvariantError(
            `${tplName} has arg referencing missing param ${arg.param.variable.name}`,
            { site, component, tpl, vs, arg }
          );
        }
        const r = tryGetVariantGroupValueFromArg(tpl.component, arg);
        if (r) {
          // Check if all variants belong to the variant group
          const variantsInVg = new Set(r.vg.variants);
          if (r.variants.some((v) => !variantsInVg.has(v))) {
            const variant = ensure(
              r.variants.find((v) => !variantsInVg.has(v)),
              () =>
                `Already that r.variants contains a variant not in variantsInVg`
            );
            yield new InvariantError(
              `${tplName} has variant arg ${variant.uuid} referencing a missing variant for variant group "${arg.param.variable.name}"`,
              { site, component, tpl, vs, vg: r.vg, arg }
            );
          }
        } else {
          // We couldn't find the variant group for those referenced variants
          // in the component
          if (isKnownVariantsRef(arg.expr)) {
            yield new InvariantError(
              `${tplName} has arg referencing variants from another component`
            );
          }
        }
      }
    }

    // Check that TplComponents of components with public states are named
    if (!tpl.name && tpl.component.states.some((s) => !isPrivateState(s))) {
      yield new InvariantError(
        `Instance of ${tpl.component.name} (component with public states) is not named`
      );
    }
  }
}

function* genGlobalContextErrors(site: Site) {
  // We compile a list of global context components that must have corresponding
  // site.globalContexts. It is possible for a project dependency to have the
  // "same" global context components -- for example, a dependent project and this
  // project both use the same app host, that register the same global context.
  // This will show up as two separate Components with the same name, but not
  // referentially the same. We use uniqBy here to make sure we keep the
  // global context component in _this_ project. Otherwise, we may fail the
  // invariant of a component with no corresponding tpl, when we check the
  // context component in the dep.
  const registeredGlobalContexts = new Set(
    uniqBy(
      allComponents(site, {
        includeDeps: "all",
      }).filter((c) => isContextCodeComponent(c)),
      (c) => c.name
    )
  );

  const globalContextsTpls = new Set(
    site.globalContexts.map((t) => t.component)
  );

  for (const gc of registeredGlobalContexts) {
    if (!globalContextsTpls.has(gc)) {
      yield new InvariantError(
        `Global Context ${gc.name} has component registered but no corresponding tpl`
      );
    }
  }
  const seenComponents: Set<string> = new Set();
  for (const gc of globalContextsTpls) {
    if (!registeredGlobalContexts.has(gc as ContextCodeComponent)) {
      yield new InvariantError(
        `Global Context ${gc.name} has tpl but no corresponding registered component`
      );
    }
    if (seenComponents.has(gc.name)) {
      yield new InvariantError(
        `Global Context ${gc.name} has duplicate tpl component`
      );
    }
    seenComponents.add(gc.name);
  }
}

function* genFrameErrors(site: Site, arena: AnyArena, frame: ArenaFrame) {
  const globalVariants = getGlobalVariants(site);
  const globalVariantKeys = globalVariants.map((v) => v.uuid);

  const frameName = `"${
    isMixedArena(arena) ? arena.name : getComponentDisplayName(arena.component)
  }"."${frame.name}"`;
  // Check that the root TplComponent only has a single vsetting using site.globalVariant
  if (
    frame.container.vsettings.length !== 1 ||
    frame.container.vsettings[0].variants.length !== 1 ||
    frame.container.vsettings[0].variants[0] !== site.globalVariant
  ) {
    yield new InvariantError(
      `Root TplComponent of frame ${frameName} has the wrong base variant for its single vsetting`,
      { site, arena, frame }
    );
  }

  // Checks that targeted / pinned variants in the frame are all valid
  for (const variantKey of L.keys(frame.pinnedGlobalVariants)) {
    if (!globalVariantKeys.includes(variantKey)) {
      yield new InvariantError(
        `Frame ${frameName} pins non-existent global variant, ${variantKey}`,
        { site, arena, frame, variantKey }
      );
    }
  }

  for (const variant of frame.targetGlobalVariants) {
    if (!globalVariants.includes(variant)) {
      yield new InvariantError(
        `Frame ${frameName} targets non-existent global variant, ${variant.name}`,
        { site, arena, frame, variant }
      );
    }
  }

  const componentVariants = getComponentVariants(frame.container.component);
  const componentVariantDict = L.keyBy(componentVariants, (v) => v.uuid);
  for (const variantKey of L.keys(frame.pinnedVariants)) {
    const variant = componentVariantDict[variantKey];
    if (!variant) {
      yield new InvariantError(
        `Frame ${frameName} pins non-existent component variant, ${variantKey}`,
        { site, arena, frame, variantKey }
      );
    } else if (isPrivateStyleVariant(variant)) {
      yield new InvariantError(
        `Frame ${frameName} pins private style variant, ${variantKey}`,
        { site, arena, frame, variantKey }
      );
    }
  }
  for (const variant of frame.targetVariants) {
    if (!componentVariants.includes(variant)) {
      yield new InvariantError(
        `Frame ${frameName} targets non-existent component variant, ${variant.name}`,
        { site, arena, frame, variant }
      );
    }
    if (isPrivateStyleVariant(variant)) {
      yield new InvariantError(
        `Frame ${frameName} targets private style variant`,
        { site, arena, frame, variant }
      );
    }
  }
}

let componentToVariants = new WeakMap<Component, Variant[]>();
let siteToGlobalVariants = new WeakMap<Site, Variant[]>();
let siteToValidRefs = new WeakMap<Site, Set<ImportableObject>>();

function getComponentVariants(component: Component) {
  if (!componentToVariants.has(component)) {
    componentToVariants.set(
      component,
      allComponentVariants(component, { includeSuperVariants: true })
    );
  }

  return ensure(
    componentToVariants.get(component),
    () => `Already checked this exists`
  );
}

function getGlobalVariants(site: Site) {
  if (!siteToGlobalVariants.has(site)) {
    siteToGlobalVariants.set(
      site,
      allGlobalVariants(site, { includeDeps: "direct" })
    );
  }
  return ensure(
    siteToGlobalVariants.get(site),
    () => `Already checked this exists`
  );
}

function getValidRefs(site: Site) {
  if (!siteToValidRefs.has(site)) {
    siteToValidRefs.set(
      site,
      new Set([
        ...allComponents(site, { includeDeps: "direct" }),
        ...allStyleTokens(site, { includeDeps: "all" }),
        ...allMixins(site, { includeDeps: "all" }),
        ...allImageAssets(site, { includeDeps: "all" }),
      ])
    );
  }
  return ensure(siteToValidRefs.get(site), () => `Already checked this exists`);
}
