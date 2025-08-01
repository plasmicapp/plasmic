import { FinalStyleToken, resolveAllTokenRefs } from "@/wab/commons/StyleToken";
import {
  arrayEqIgnoreOrder,
  assert,
  ensure,
  isSubList,
  strictFind,
  withoutNils,
} from "@/wab/shared/common";
import {
  isCodeComponent,
  isDefaultComponent,
  isHostLessCodeComponent,
  isPlumeComponent,
  PlumeComponent,
} from "@/wab/shared/core/components";
import { clone as cloneExpr } from "@/wab/shared/core/exprs";
import { syncGlobalContexts } from "@/wab/shared/core/project-deps";
import {
  allStyleTokensAndOverrides,
  isHostLessPackage,
} from "@/wab/shared/core/sites";
import { createExpandedRuleSetMerger } from "@/wab/shared/core/styles";
import {
  clone as cloneTpl,
  findVariantSettingsUnderTpl,
  fixParentPointers,
  flattenTplsBottomUp,
  isTplCodeComponent,
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplVariantable,
  walkTpls,
} from "@/wab/shared/core/tpls";
import {
  adaptEffectiveVariantSetting,
  EffectiveVariantSetting,
  getActiveVariantsInArg,
  getEffectiveVariantSettingForInsertable,
} from "@/wab/shared/effective-variant-setting";
import { fixGlobalVariants } from "@/wab/shared/insertable-templates/fixers";
import {
  InlineComponentContext,
  InsertableTemplateExtraInfo,
} from "@/wab/shared/insertable-templates/types";
import {
  Arg,
  Component,
  CustomCode,
  isKnownCustomCode,
  isKnownRenderExpr,
  isKnownTplTag,
  isKnownVariantsRef,
  RenderExpr,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  Variant,
  VariantSetting,
  VariantsRef,
} from "@/wab/shared/model/classes";
import { RSH, RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { getSlotArgs } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  isBaseVariant,
  mkVariantSetting,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import { flatten } from "lodash";

/**
 * Make a best effort to copy base variant styles `from` => `to`
 * This is useful when inlining TplSlots and TplComponents
 * where we apply styles down to children
 * @param from
 * @param to
 * @returns
 */
function tryCopyBaseVariantStyles(from: TplNode, to: TplNode): void {
  if (!isTplVariantable(from)) {
    return console.warn(`${from} is not a TplNode`);
  } else if (!isTplVariantable(to)) {
    return console.warn(`${to} is not a TplNode`);
  }

  const fromBaseVs = tryGetBaseVariantSetting(from);
  const toBaseVs = tryGetBaseVariantSetting(to);

  if (!fromBaseVs) {
    return console.warn(`${from} is missing a base variant setting`);
  } else if (!toBaseVs) {
    return console.warn(`${to} is missing a base variant setting`);
  }

  // Don't add width/height props when it's default, so that the root
  // of slot/component prop is not overwritten
  const sourceRsh = RSH(fromBaseVs.rs, from as TplNode);
  ["width", "height"].forEach((prop) => {
    if (sourceRsh.get(prop) === "default") {
      sourceRsh.clear(prop);
    }
  });

  // Copy the styles
  const targetRsHelper = new RuleSetHelpers(
    toBaseVs.rs,
    isKnownTplTag(to) ? to.tag : "div"
  );
  targetRsHelper.mergeRs(fromBaseVs.rs);

  // Copy the dataCond (used to hide elements)
  toBaseVs.dataCond = fromBaseVs.dataCond
    ? cloneExpr(fromBaseVs.dataCond)
    : null;
}

export function inlineMixin(tpl: TplNode, vs: VariantSetting) {
  const forTag = isKnownTplTag(tpl) ? tpl.tag : "div";
  const rsHelper = new RuleSetHelpers(vs.rs, forTag);
  const rsMerge = createExpandedRuleSetMerger(vs.rs, tpl);

  // Merge all mixins into the children
  for (const prop of rsMerge.props()) {
    rsHelper.set(prop, rsMerge.get(prop));
  }

  // Wipe list of mixins
  vs.rs.mixins = [];
}

/**
 * Mutates a TplTree by in-lining all mixin styles
 * @param tplTree
 */
export function inlineMixins(tplTree: TplNode) {
  // Walk TplTree
  const vsAndTpls = [...findVariantSettingsUnderTpl(tplTree)];
  for (const [vs, tpl] of vsAndTpls) {
    inlineMixin(tpl, vs);
  }
}

/**
 * Mutates a TplTree by resolving all token refs
 * @param tplTree
 */
export function inlineTokens(
  tplTree: TplNode,
  tokens: FinalStyleToken[],
  onFontSeen?: (font: string) => void
) {
  // Walk TplTree
  const vsAndTpls = [...findVariantSettingsUnderTpl(tplTree)];
  for (const [vs, tpl] of vsAndTpls) {
    const forTag = isKnownTplTag(tpl) ? tpl.tag : "div";
    const rsHelper = new RuleSetHelpers(vs.rs, forTag);

    // Iterate over all Rules to resolve token refs
    for (const prop of rsHelper.props()) {
      const val = rsHelper.getRaw(prop);
      if (val) {
        const realVal = resolveAllTokenRefs(val, tokens);
        rsHelper.set(prop, realVal);
        if (prop === "font-family") {
          onFontSeen?.(realVal);
        }
      }
    }
  }
}

/**
 * Tries to find a plume component present in @targetSite that can be used to replace
 * the component of @sourceTpl . If there is any plume component that has the all the
 * referenced variants/params from @sourceTpl we use it. In case we don't find an
 * existing component we simply attach a new plumeComponent.
 *
 * This can lead to:
 * - Losing styles from source (if the source is personalized it are not taking this in consideration,
 *   we could try to match styles, or clone the component from `sourceTpl.component`, but this can
 *   lead to creating more plume components).
 * - Losing args, if we don't have an already existing component with the required params/variants it's
 *   going to be attached a new plume component that may don't have the params too, which would lead to
 *   them not being updated.
 */
export const getSiteMatchingPlumeComponent = (
  targetSite: Site,
  sourceSite: Site,
  sourceTpl: TplComponent,
  targetPlumeSite: Site | undefined,
  info: Pick<InsertableTemplateExtraInfo, "screenVariant">
) => {
  if (!isPlumeComponent(sourceTpl.component)) {
    return undefined;
  }

  const sourceComponent = sourceTpl.component;
  const targetType = sourceComponent.plumeInfo.type;
  const requiredParams = sourceTpl.vsettings[0].args.map(
    (a) => `Param-${a.param.variable.name}`
  );
  const getVariantName = (v: Variant) => {
    return `Variant-${v.name}+${(v.selectors || []).join(",")}`;
  };
  const requiredVariants = flatten(
    sourceTpl.vsettings[0].args.map((a) => {
      if (isKnownVariantsRef(a.expr)) {
        return a.expr.variants.map(getVariantName);
      }
      return [];
    })
  );

  const getVariantNames = (x: PlumeComponent) => {
    return flatten([
      ...x.variantGroups.map((e) => e.variants.map(getVariantName)),
      x.variants.map(getVariantName),
    ]);
  };

  const getParamNames = (x: PlumeComponent) => {
    return x.params.map((p) => `Param-${p.variable.name}`);
  };

  const matchingNameReferences = (candidate: PlumeComponent) => {
    const candidateVariantNames = getVariantNames(candidate);
    const candidateParamNames = getParamNames(candidate);
    return (
      isSubList(candidateVariantNames, requiredVariants) &&
      isSubList(candidateParamNames, requiredParams)
    );
  };

  // Check if target site already has a plume component that matches the references
  const existingComponent = targetSite.components.find(
    (c) =>
      isPlumeComponent(c) &&
      c.plumeInfo.type === targetType &&
      matchingNameReferences(c)
  );

  if (existingComponent) {
    return existingComponent;
  }

  const cloneFromSite = (site: Site, plumeComponent: PlumeComponent) => {
    const component = new TplMgr({ site: targetSite }).clonePlumeComponent(
      site,
      plumeComponent.uuid,
      plumeComponent.name,
      true
    );

    // Since we can clone a plume component from another site, we have to check the following cases:
    // 1. The component maybe have some value from mixin, which we have to inline
    // 2. The component may have some tokens, which we also have to inline
    // 3. The component may reference a global variant, which we won't support in the insertable template
    //    3.1. Except for a screen variant which is going to be replaced by the one present in `ctx.extraInfo.screenVariant`
    //
    // We expect this to be sufficient, since ideally more advanced changes wouldn't be expected in plume components
    // More handling is made `adjustInsertableTemplateComponentArgs`

    inlineMixins(component.tplTree);
    const allTokens = allStyleTokensAndOverrides(site, { includeDeps: "all" });
    // We ignore fonts here, because as we are inlining the tree we will pass again
    // through this elements
    inlineTokens(component.tplTree, allTokens);

    const vsAndTpls = [...findVariantSettingsUnderTpl(component.tplTree)];
    for (const [vs, tpl] of vsAndTpls) {
      fixGlobalVariants(tpl, vs, { screenVariant: info.screenVariant });
    }

    return component;
  };

  // Check if source site has the component, with the correct matching, it should have
  const sourceSiteComponent = sourceSite.components.find(
    (c): c is PlumeComponent =>
      isPlumeComponent(c) &&
      c.plumeInfo.type === targetType &&
      c.uuid === sourceComponent.uuid // since we are cloning from the same site, we can use the uuid
  );

  if (sourceSiteComponent) {
    return cloneFromSite(sourceSite, sourceSiteComponent);
  }

  // fallback to target plume site
  if (!targetPlumeSite) {
    return undefined;
  }

  const plumeComponents = targetPlumeSite.components;
  const plumeComponent = plumeComponents.find(
    (c): c is PlumeComponent =>
      isPlumeComponent(c) && c.plumeInfo.type === targetType
  );

  if (!plumeComponent) {
    return undefined;
  }

  return cloneFromSite(targetPlumeSite, plumeComponent);
};

/**
 * Mutates a TplTree by removing all components and slots
 * - We combine the inlining for components and slots because
 *   we need to make sure we are calling it recursively on components
 *   while avoiding nested slots
 * Note: We run it iteratively until the tree is no longer modified.
 *  This could be simplified via recursion in the future,
 *  but I was getting a weird mutability bug and wanted to make sure this
 * worked first
 * @param tplTree
 * @return components used
 */
export function inlineComponents(
  tplTree: TplNode,
  ctx: InlineComponentContext
): Set<string> {
  let isModified: boolean;
  /**
   * We store the uuid of TplComponents that we have already adjusted
   * (default/plume/hostless), this way when we are in the do..while loop we
   * don't traverse the tree multiple times trying to adjust these TplComponents
   * more times that the needed
   */
  const adjustedTplComponentUuids: Set<string> = new Set<string>();
  do {
    isModified = _inlineComponentsHelper(
      tplTree,
      ctx,
      adjustedTplComponentUuids
    );
  } while (isModified);
  return adjustedTplComponentUuids;
}

function _inlineComponentsHelper(
  tplTree: TplNode,
  ctx: InlineComponentContext,
  adjustedComponents: Set<string>
): boolean {
  const queue: TplComponent[] = [];
  walkTpls(tplTree, {
    pre(tpl, _path) {
      if (isTplComponent(tpl)) {
        // We skip it if we have already adjusted it
        if (adjustedComponents.has(tpl.uuid)) {
          return false;
        }

        if (adjustInsertableTemplateComponent(tpl, ctx)) {
          adjustedComponents.add(tpl.uuid);
          return false;
        }

        queue.push(tpl);
        return false; // Don't descend past a compoment instance
      } else if (isTplSlot(tpl)) {
        return false; // Don't descend past a slot
      } else {
        return true;
      }
    },
  });

  for (const tplComp of queue) {
    assert(isTplComponent(tplComp), "Expected a TplComponent");

    const newTpl = inlineTplComponent(tplComp, ctx.sourceComp, ctx.sourceSite);

    // Replace the TplComponent
    $$$(tplComp).replaceWith(newTpl);
    newTpl.parent = tplComp.parent;
  }
  fixParentPointers(tplTree);

  // Return true if any mutation happened
  return queue.length > 0;
}

function inlineTplComponent(
  tplComp: TplNode,
  sourceComp: Component,
  sourceSite: Site
) {
  assert(isTplComponent(tplComp), "Expected a TplComponent");

  const newTpl = cloneTpl(tplComp.component.tplTree);
  // Merge down the styling into the root
  tryCopyBaseVariantStyles(tplComp, newTpl);

  // Try to apply the active variants in tplTree
  const slotArgs = getSlotArgs(tplComp);
  const baseVs = ensure(
    tryGetBaseVariantSetting(tplComp),
    "Should have base variant"
  );
  const activeVariants = getActiveVariantsInArg(tplComp.component, baseVs.args);

  // Apply the active variants down the entire tree
  for (const t of flattenTplsBottomUp(newTpl)) {
    if (!isTplVariantable(t)) {
      continue;
    }
    const effectiveVs = getEffectiveVariantSettingForInsertable(
      t,
      activeVariants,
      sourceComp,
      sourceSite
    );
    const baseVsForNode = ensure(
      tryGetBaseVariantSetting(t),
      "Should have base variant"
    );
    adaptEffectiveVariantSetting(t, baseVsForNode, effectiveVs);
  }

  // Inline all the slots to avoid nested slots
  inlineSlots(newTpl, slotArgs);
  return newTpl;
}

/**
 * Used for debugging VariantSettings
 * @param vs
 */
function _printVs(vs: VariantSetting | EffectiveVariantSetting) {
  console.log(vs.text);
  const targetRsHelper = new RuleSetHelpers(vs.rs, "div");
  const props = targetRsHelper.props();
  for (const p of props) {
    console.log(`  ${p}: ${targetRsHelper.get(p)}`);
  }
}

/**
 * Mutates a TplTree by in-lining all slots
 * @param tplTree
 * @param slotArgs - TplSlots to be replaced according to these args
 * @returns true if tplTree mutated
 */
export function inlineSlots(tplTree: TplNode, slotArgs?: Arg[]): boolean {
  const queue: TplSlot[] = [];
  walkTpls(tplTree, {
    pre(tpl, _path) {
      if (isTplSlot(tpl)) {
        queue.push(tpl);
        return false; // Don't descend past a slot
      } else if (isTplComponent(tpl)) {
        return true;
      } else {
        return true;
      }
    },
  });

  for (const tplSlot of queue) {
    assert(isTplSlot(tplSlot), "Expected a TplSlot");

    const tplParent = ensure(
      tplSlot.parent,
      "TplSlot must have a parent in insertable templates"
    );
    const arg = slotArgs
      ? slotArgs.find((a) => a.param === tplSlot.param)
      : undefined;
    const children =
      arg && isKnownRenderExpr(arg.expr)
        ? arg.expr.tpl // Use specified slot args if found
        : tplSlot.defaultContents; // Otherwise, use default contents

    children.forEach((child) => {
      const newTpl = cloneTpl(child);
      // Merge in TplSlot VariantSettings
      // Note: we are only merging the rules on base variants
      tryCopyBaseVariantStyles(tplSlot, newTpl);
      // Add each of default contents as siblings
      $$$(tplSlot).before(newTpl);
      newTpl.parent = tplParent;
    });
    // Remove the TplSlot
    $$$(tplSlot).remove({ deep: false });
    //tplSlot.parent = null;
  }
  fixParentPointers(tplTree);
  return queue.length > 0;
}

/**
 * Tries to mantain the maximun of args of a component so that the template
 * doesn't lose much of it's styles, it handles both the plume as the hostless
 * cases
 */
const adjustInsertableTemplateComponentArgs = (
  sourceTpl: TplComponent,
  component: Component,
  ctx: InlineComponentContext
) => {
  const oldArgs = sourceTpl.vsettings[0].args;
  sourceTpl.vsettings[0].args = [];
  const allComponentVariants = flatten([
    ...component.variantGroups.map((e) => e.variants),
    component.variants,
  ]);
  oldArgs.forEach((arg) => {
    const param = component.params.find(
      (p) => p.variable.name === arg.param.variable.name
    );
    if (!param) {
      return;
    }
    if (isKnownVariantsRef(arg.expr)) {
      const argVariants = withoutNils(
        arg.expr.variants.map((v) => {
          return allComponentVariants.find(
            (v2) =>
              v2.name === v.name &&
              arrayEqIgnoreOrder(v2.selectors || [], v.selectors || [])
          );
        })
      );
      sourceTpl.vsettings[0].args.push(
        new Arg({
          param,
          expr: new VariantsRef({
            variants: argVariants,
          }),
        })
      );
    } else if (isKnownCustomCode(arg.expr)) {
      sourceTpl.vsettings[0].args.push(
        new Arg({
          param,
          expr: new CustomCode({
            code: arg.expr.code,
            fallback: undefined,
          }),
        })
      );
    } else if (isKnownRenderExpr(arg.expr)) {
      // If we are dealing with RenderExpr (slot content) we have to adjust the parent
      // to be the sourceTpl instead of any previous ref. Plume components/sub-components
      // and host less components keep their behavior, the rest is inlined.
      const renderTpl = withoutNils(
        arg.expr.tpl.map((tpl) => {
          if (isTplComponent(tpl) && isPlumeComponent(tpl.component)) {
            // If the component of sourceTpl is a plume component we try to check
            // by sub components
            const subComp =
              isPlumeComponent(component) &&
              component.subComps.find(
                (_subComp) =>
                  _subComp.plumeInfo?.type === tpl.component.plumeInfo?.type
              );
            if (!subComp) {
              // if there is no sub comp it must be a general plume component
              // present in site
              if (!adjustPlumeComponent(tpl, ctx)) {
                return null;
              }
            } else {
              // we try to adjust the params recursevely for tpl
              adjustInsertableTemplateComponentArgs(tpl, subComp, ctx);
              tpl.component = subComp;
            }
            tpl.parent = sourceTpl;
            return tpl;
          } else if (
            isTplComponent(tpl) &&
            isHostLessCodeComponent(tpl.component)
          ) {
            // Try to adjust hostless component if we aren't able, we simply ignore it
            if (!adjustHostLessCodeComponent(tpl, ctx)) {
              return null;
            }
            tpl.parent = sourceTpl;
            return tpl;
          } else if (isTplComponent(tpl) && isCodeComponent(tpl.component)) {
            if (!adjustHostedCodeComponent(tpl, ctx)) {
              return null;
            }
            tpl.parent = sourceTpl;
            return tpl;
          } else if (isTplTag(tpl) || isTplComponent(tpl)) {
            let tplTag: TplNode = tpl;
            if (isTplComponent(tplTag)) {
              const newTpl = inlineTplComponent(
                tpl,
                ctx.sourceComp,
                ctx.sourceSite
              );
              newTpl.parent = sourceTpl;
              tplTag = newTpl;
            }
            inlineSlots(tplTag);
            inlineComponents(tplTag, ctx);
            inlineMixins(tplTag);
            inlineTokens(
              tplTag,
              allStyleTokensAndOverrides(ctx.sourceSite, { includeDeps: "all" })
            );
            tplTag.parent = sourceTpl;
            return tplTag;
          } else {
            // tpl slot
            return null;
          }
        })
      );
      sourceTpl.vsettings[0].args.push(
        new Arg({
          param,
          expr: new RenderExpr({
            tpl: renderTpl,
          }),
        })
      );
    }
  });
};

const adjustPlumeComponent = (
  tpl: TplComponent,
  ctx: InlineComponentContext
): boolean => {
  const { targetSite, targetBaseVariant, plumeSite } = ctx;

  if (!plumeSite) {
    return false;
  }

  if (isPlumeComponent(tpl.component)) {
    const newVSettings = tpl.vsettings.filter((vs) =>
      isBaseVariant(vs.variants)
    );
    // ensure that vsettings has size at most 1
    newVSettings.splice(1);
    if (newVSettings.length === 0) {
      newVSettings.push(mkVariantSetting({ variants: [targetBaseVariant] }));
    } else {
      newVSettings[0].variants = [targetBaseVariant];
    }
    tpl.vsettings = newVSettings;

    const matchedComponent = getSiteMatchingPlumeComponent(
      targetSite,
      ctx.sourceSite,
      tpl,
      plumeSite,
      ctx.extraInfo
    );

    if (matchedComponent && tpl.component === matchedComponent) {
      return true;
    }

    // If we don't find a match we should inline this component
    if (!matchedComponent) {
      return false;
    }

    adjustInsertableTemplateComponentArgs(tpl, matchedComponent, ctx);
    tpl.component = matchedComponent;
    return true;
  }

  return false;
};

export function ensureHostLessDepComponent(
  targetSite: Site,
  comp: Component,
  info: Pick<InsertableTemplateExtraInfo, "site" | "hostLessDependencies">
) {
  assert(
    isHostLessCodeComponent(comp),
    `Should only be called for hostless components`
  );

  const { site: sourceSite } = info;

  // Note that we need to use the project dependencies in
  // info.hostLessDependencies, because they are unbundled by
  // the same bundler as for targetSite, so we can safely use
  // the references in there. We CANNOT use references from
  // info.sourceSite, because it is unbundled by a different bundler.
  const ownerDep = Object.values(info.hostLessDependencies).find(
    ({ projectDependency }) =>
      projectDependency.site.components.some((c) => c.name === comp.name)
  )?.projectDependency;

  assert(ownerDep, `Unknown hostless dependency for component ${comp.name}`);

  const neededDeps = [
    ownerDep,
    ...ownerDep.site.projectDependencies.filter((d) =>
      isHostLessPackage(d.site)
    ),
  ];

  const missingDeps = neededDeps.filter(
    (d) => !targetSite.projectDependencies.find((td) => d.pkgId === td.pkgId)
  );

  for (const missingDep of missingDeps) {
    console.log(`Installing missing hostless package ${missingDep.name}`);

    targetSite.projectDependencies.push(missingDep);

    // We need to sync new global contexts as well, and we will
    // copy over values for new global contexts from sourceSite
    const oldGlobalContexts = [...targetSite.globalContexts];
    syncGlobalContexts(missingDep, targetSite);

    const newGlobalContexts = targetSite.globalContexts.filter(
      (gc) =>
        !oldGlobalContexts.some(
          (oldGc) => oldGc.component.name === gc.component.name
        )
    );

    newGlobalContexts.forEach((gc) => {
      const sourceSiteGc = sourceSite.globalContexts.find(
        (sourceGc) => sourceGc.component.name === gc.component.name
      )!;
      sourceSiteGc.vsettings[0].args.forEach((arg) => {
        gc.vsettings[0].args.push(
          new Arg({
            param: strictFind(
              gc.component.params,
              (p) => p.variable.name === arg.param.variable.name
            ),
            expr: cloneExpr(arg.expr),
          })
        );
      });
    });
  }

  // Find the new corresponding component
  const newComp = ensure(
    ownerDep.site.components.find((c) => c.name === comp.name),
    `Must succeed because we checked this earlier`
  );
  return newComp;
}

const adjustHostedCodeComponent = (
  tpl: TplComponent,
  ctx: InlineComponentContext
) => {
  if (
    !isCodeComponent(tpl.component) ||
    isHostLessCodeComponent(tpl.component)
  ) {
    return false;
  }
  const newComp = ctx.targetSite.components.find(
    (c) => isCodeComponent(c) && c.name === tpl.component.name
  );
  assert(
    newComp,
    `Component ${tpl.component.name} isn't available in this project`
  );
  assert(
    isCodeComponent(newComp),
    "must succeed because it was checked before"
  );
  tpl.component = newComp;
  adjustInsertableTemplateComponentArgs(tpl, newComp, ctx);
  return true;
};

const adjustHostLessCodeComponent = (
  tpl: TplComponent,
  ctx: InlineComponentContext
) => {
  if (!isHostLessCodeComponent(tpl.component)) {
    return false;
  }

  const comp = ensureHostLessDepComponent(
    ctx.targetSite,
    tpl.component,
    ctx.extraInfo
  );
  tpl.component = comp;
  adjustInsertableTemplateComponentArgs(tpl, comp, ctx);
  return true;
};

/** Returns true if component is handled and should not be inlined. */
const adjustInsertableTemplateComponent = (
  tpl: TplComponent,
  ctx: InlineComponentContext
): boolean => {
  // Don't inline default components (usually Plexus components).
  if (isDefaultComponent(ctx.sourceSite, tpl.component)) {
    adjustInsertableTemplateComponentArgs(tpl, tpl.component, ctx);
    return true;
  }
  if (isPlumeComponent(tpl.component)) {
    return adjustPlumeComponent(tpl, ctx);
  }
  if (isHostLessCodeComponent(tpl.component)) {
    return adjustHostLessCodeComponent(tpl, ctx);
  }
  if (isTplCodeComponent(tpl)) {
    return adjustHostedCodeComponent(tpl, ctx);
  }
  return false;
};
