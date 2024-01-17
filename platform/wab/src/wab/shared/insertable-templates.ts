import {
  Arg,
  Component,
  ComponentTemplateInfo,
  CustomCode,
  ImageAsset,
  ImageAssetRef,
  isKnownCustomCode,
  isKnownImageAssetRef,
  isKnownPageHref,
  isKnownRenderExpr,
  isKnownTplTag,
  isKnownVariantsRef,
  ProjectDependency,
  RenderExpr,
  RuleSet,
  Site,
  StyleToken,
  TplComponent,
  TplNode,
  TplSlot,
  Variant,
  VariantedValue,
  VariantSetting,
  VariantsRef,
} from "@/wab/classes";
import {
  arrayEqIgnoreOrder,
  assert,
  ensure,
  isSubList,
  remove,
  strictFind,
  withoutNils,
} from "@/wab/common";
import {
  derefToken,
  derefTokenRefs,
  hasTokenRefs,
  mkTokenRef,
  replaceAllTokenRefs,
  resolveAllTokenRefs,
  TokenType,
} from "@/wab/commons/StyleToken";
import {
  cloneComponent,
  isCodeComponent,
  isHostLessCodeComponent,
  isPlumeComponent,
  PlumeComponent,
} from "@/wab/components";
import {
  InsertableTemplateComponentResolution,
  InsertableTemplateTokenResolution,
} from "@/wab/devflags";
import { clone as cloneExpr } from "@/wab/exprs";
import { ImageAssetType } from "@/wab/image-asset-type";
import { mkImageAssetRef } from "@/wab/image-assets";
import { syncGlobalContexts } from "@/wab/project-deps";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { allImageAssets, allStyleTokens, isHostLessPackage } from "@/wab/sites";
import { createExpandedRuleSetMerger } from "@/wab/styles";
import {
  clone as cloneTpl,
  findVariantSettingsUnderTpl,
  fixParentPointers,
  flattenTpls,
  flattenTplsBottomUp,
  isTplCodeComponent,
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplTextBlock,
  isTplVariantable,
  TplTextTag,
  walkTpls,
} from "@/wab/tpls";
import { flatten, keyBy } from "lodash";
import { flattenComponent, siteToAllImageAssetsDict } from "./cached-selectors";
import {
  adaptEffectiveVariantSetting,
  EffectiveVariantSetting,
  getActiveVariantsInArg,
  getEffectiveVariantSettingForInsertable,
} from "./effective-variant-setting";
import {
  joinCssValues,
  RSH,
  RuleSetHelpers,
  splitCssValue,
} from "./RuleSetHelpers";
import { PkgInfo } from "./SharedApi";
import { getSlotArgs, isTypographyNode } from "./SlotUtils";
import { makeComponentSwapper } from "./swap-components";
import { TplMgr } from "./TplMgr";
import { $$$ } from "./TplQuery";
import {
  isBaseVariant,
  isGlobalVariant,
  isScreenVariant,
  mkVariantSetting,
  tryGetBaseVariantSetting,
} from "./Variants";

export interface InsertableTemplateExtraInfo {
  site: Site;
  component: Component;
  screenVariant: Variant | undefined;
  hostLessDependencies: Record<
    string,
    {
      pkg: PkgInfo;
      projectDependency: ProjectDependency;
    }
  >;
  projectId: string;
  resolution: {
    token?: InsertableTemplateTokenResolution;
    component?: InsertableTemplateComponentResolution;
  };
}

/**
 * Mutates a TplTree by in-lining all mixin styles
 * @param tplTree
 */
export function inlineMixins(tplTree: TplNode) {
  // Walk TplTree
  const vsAndTpls = [...findVariantSettingsUnderTpl(tplTree)];
  for (const [vs, tpl] of vsAndTpls) {
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
}

/**
 * Mutates a TplTree by resolving all token refs
 * @param tplTree
 */
export function inlineTokens(
  tplTree: TplNode,
  tokens: StyleToken[],
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

interface InlineComponentContext {
  sourceSite: Site;
  sourceComp: Component;
  targetSite: Site;
  targetBaseVariant: Variant;
  extraInfo: InsertableTemplateExtraInfo;
  plumeSite: Site | undefined;
}

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
 */
export function inlineComponents(
  tplTree: TplNode,
  ctx: InlineComponentContext
) {
  let isModified: boolean;
  /**
   * We store the uuid of components that we have already adjusted (plume/hostless), this way
   * when we are in the do..while loop we don't traverse the tree multiple times trying to adjust
   * plume/hostless components more times that the needed
   */
  const adjustedComponents: Set<string> = new Set<string>();
  do {
    isModified = _inlineComponentsHelper(tplTree, ctx, adjustedComponents);
  } while (isModified);
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
 * Checks that the tplTree is a valid insertable template
 * - For now, just checks that there are no TplSlots and TplComponents
 * @param tplTree
 */
export function assertValidInsertable(
  tplTree: TplNode,
  allowComponents: boolean
): void {
  walkTpls(tplTree, {
    pre(tpl, path) {
      if (isTplSlot(tpl)) {
        console.warn("Path:");
        console.warn(path);
        assert(false, "Insertable templates cannot have TplSlots");
      } else if (isTplComponent(tpl) && !allowComponents) {
        if (
          !(isPlumeComponent(tpl.component) || isCodeComponent(tpl.component))
        ) {
          console.warn("Path:");
          console.warn(path);
          assert(false, "Insertable templates cannot have TplComponents");
        }
      }
      return true;
    },
  });
}

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
const getSiteMatchingPlumeComponent = (
  targetSite: Site,
  sourceSite: Site,
  sourceTpl: TplComponent,
  targetPlumeSite: Site | undefined,
  info: InsertableTemplateExtraInfo
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
    const allTokens = allStyleTokens(site, { includeDeps: "all" });
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
              allStyleTokens(ctx.sourceSite, { includeDeps: "all" })
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

function ensureHostLessDepComponent(
  targetSite: Site,
  comp: Component,
  info: InsertableTemplateExtraInfo
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

const adjustInsertableTemplateComponent = (
  tpl: TplComponent,
  ctx: InlineComponentContext
): boolean => {
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

const fixTextTplStyles = (
  tpl: TplTextTag,
  vs: VariantSetting,
  allTokens: StyleToken[],
  sourceComp: Component,
  sourceSite: Site
) => {
  const fixedRsh = new RuleSetHelpers(
    new RuleSet({
      values: {},
      mixins: [],
    }),
    tpl.tag
  );

  if (isBaseVariant(vs.variants)) {
    const effectiveVs = getEffectiveVariantSettingForInsertable(
      tpl,
      vs.variants,
      sourceComp,
      sourceSite
    );
    const effectiveRsh = effectiveVs.rshWithThemeSlot();
    for (const prop of effectiveRsh.props()) {
      fixedRsh.set(prop, effectiveRsh.get(prop));
    }
  } else {
    // In case we are not dealing with the base variant we just use the directly setted props
    fixedRsh.mergeRs(vs.rs);
  }

  for (const prop of fixedRsh.props()) {
    const val = fixedRsh.getRaw(prop);
    if (val) {
      fixedRsh.set(prop, resolveAllTokenRefs(val, allTokens));
    }
  }
  const targetRsh = new RuleSetHelpers(vs.rs, tpl.tag);
  targetRsh.mergeRs(fixedRsh.rs());
};

const fixBackgroundImage = (
  tpl: TplNode,
  vs: VariantSetting,
  allImageAssetsDict: Record<string, ImageAsset>,
  addImageAsset: (e: ImageAsset) => ImageAsset | undefined
) => {
  // We have to handle background images in the templates by either adding the asset or deleting
  // the reference, so that it doesn't appear as a empty layer in the background section.
  const rsh = RSH(vs.rs, tpl);
  const background = rsh.getRaw("background");
  if (background) {
    const backgrounds = splitCssValue("background", background);
    rsh.set(
      "background",
      joinCssValues(
        "background",
        withoutNils(
          backgrounds.map((bg) => {
            if (!bg.startsWith("var(--image-")) {
              return bg;
            }
            const elements = bg.split(" ");
            const uuid = elements[0] // the image variable is always the first
              .substring("var(--image-".length)
              .slice(0, -1);
            const asset = allImageAssetsDict[uuid];
            if (asset) {
              const addedAsset = addImageAsset(asset);
              if (addedAsset) {
                return [mkImageAssetRef(addedAsset), ...elements.slice(1)].join(
                  " "
                );
              }
            }
            return null;
          })
        )
      )
    );
  }
};

function fixVariantSettingAttrs(vs: VariantSetting) {
  if ("href" in vs.attrs) {
    if (isKnownPageHref(vs.attrs.href)) {
      // Delete references to page that aren't project dependent
      delete vs.attrs.href;
    }
  }
}

export function mkInsertableComponentImporter(
  site: Site,
  info: InsertableTemplateExtraInfo,
  plumeSite: Site | undefined,
  resolveTreeTokens: (tplTree: TplNode) => void
) {
  const oldToNewComponent = new Map<Component, Component>();
  const assetFixer = makeImageAssetFixer(
    site,
    keyBy(allImageAssets(info.site, { includeDeps: "all" }), (x) => x.uuid)
  );
  const tplMgr = new TplMgr({ site });

  const fixupComp = (comp: Component) => {
    inlineMixins(comp.tplTree);
    resolveTreeTokens(comp.tplTree);
    for (const tpl of flattenComponent(comp)) {
      for (const vs of [...tpl.vsettings]) {
        fixGlobalVariants(tpl, vs, { screenVariant: info.screenVariant });
      }
      // Do this in another loop because fixGlobalVariants may remove some vs
      for (const vs of tpl.vsettings) {
        assetFixer(tpl, vs);
        fixVariantSettingAttrs(vs);
      }
      if (isTplComponent(tpl)) {
        const newComp = getNewComponent(tpl.component, tpl);
        const swapper = makeComponentSwapper(site, tpl.component, newComp);
        swapper(tpl, comp);
      }
    }
  };

  const getNewComponent = (comp: Component, tpl?: TplComponent) => {
    if (oldToNewComponent.has(comp)) {
      return oldToNewComponent.get(comp)!;
    }

    if (isHostLessCodeComponent(comp)) {
      // For hostless components, we just need to make sure our Site
      // has the necessary project dep installed. We can directly
      // keep using the `comp` instance, as long as it is unbundled
      // with the same bundler as `site`.
      return ensureHostLessDepComponent(site, comp, info);
    }

    if (isCodeComponent(comp)) {
      // If it's a code component, we need to make sure it exists in our site
      // this should be true if they are both using the same host
      const existing = site.components.find((c) => c.name === comp.name);
      assert(existing, () => `Cannot find code component ${comp.name}`);
      oldToNewComponent.set(comp, existing);
      return existing;
    }

    if (isPlumeComponent(comp)) {
      const plumeComp = getSiteMatchingPlumeComponent(
        site,
        info.site,
        ensure(tpl, "Cannot insert a plume component as a template"),
        plumeSite,
        info
      );
      assert(
        plumeComp,
        () => `Cannot find plume component ${comp.plumeInfo?.type}`
      );
      oldToNewComponent.set(comp, plumeComp);
      return plumeComp;
    }

    const existing = site.components.find(
      (c) =>
        // We can match by name if the there is one in templateInfo, or by (projectId, componentId)
        // we could also just match by componentId it should be hard to collide, but let's be safe
        //
        // It's important to note that components coming from dependencies sites will also be added
        // with the template projectId
        //
        // We also check if the component is a valid replacement based in the params/variants
        (c.templateInfo?.name &&
          c.templateInfo?.name === comp.templateInfo?.name) ||
        (c.templateInfo?.componentId === comp.uuid &&
          c.templateInfo?.projectId === info.projectId)
    );
    if (existing) {
      oldToNewComponent.set(comp, existing);
      return existing;
    }

    const newComp = cloneComp(comp);
    oldToNewComponent.set(comp, newComp);
    return newComp;
  };

  const cloneComp = (comp: Component) => {
    const newComp = cloneComponent(comp, comp.name).component;
    fixupComp(newComp);
    newComp.templateInfo = new ComponentTemplateInfo({
      name: newComp.templateInfo?.name,
      projectId: info.projectId,
      componentId: comp.uuid,
    });
    tplMgr.attachComponent(newComp);
    return newComp;
  };

  return getNewComponent;
}

export function cloneInsertableTemplateComponent(
  site: Site,
  info: InsertableTemplateExtraInfo,
  plumeSite: Site | undefined
) {
  const seenFonts = new Set<string>();

  const oldTokens = allStyleTokens(info.site, { includeDeps: "all" });

  const tokenImporter = (tplTree: TplNode) => {
    inlineTokens(tplTree, oldTokens, (font) => seenFonts.add(font));
  };

  const componentImporter = mkInsertableComponentImporter(
    site,
    info,
    plumeSite,
    tokenImporter
  );

  return { component: componentImporter(info.component), seenFonts };
}

function ensureTplWithBaseAndScreenVariants(
  sourceComp: Component,
  tpl: TplNode,
  targetBaseVariant: Variant,
  screenVariant: Variant | undefined
) {
  // Create a new array, since we can mutate tpl.vsettings
  for (const vs of [...tpl.vsettings]) {
    // Fix the variant references
    if (isBaseVariant(vs.variants)) {
      vs.variants = [targetBaseVariant];
    } else if (screenVariant && vs.variants.find((v) => isScreenVariant(v))) {
      // Replace the screen variant reference
      vs.variants = [screenVariant];
    } else {
      // Remove non-base/screen variant settings
      remove(tpl.vsettings, vs);
      console.warn(
        `Insertable template ${sourceComp.name} has a non-base/screen variant. Please remove this from the source project.`
      );
    }
  }

  if (tpl.vsettings.length > 2) {
    console.warn(
      "Tpl node has more than 2 variant settings. Removing extra variant settings",
      tpl
    );
    tpl.vsettings.splice(2);
  }
}

function mkInsertableTokenImporter(
  sourceSite: Site,
  targetSite: Site,
  sourceTokens: StyleToken[],
  targetTokens: StyleToken[],
  tokenResolution: InsertableTemplateTokenResolution | undefined,
  screenVariant: Variant | undefined,
  onFontSeen: (font: string) => void
) {
  const oldToNewToken = new Map<StyleToken, StyleToken>();

  function getOrAddToken(oldTokens: StyleToken[], oldToken: StyleToken) {
    if (oldToNewToken.has(oldToken)) {
      return oldToNewToken.get(oldToken)!;
    }

    // `targetTokens` won't consider tokens that have been added by `getOrAddToken`
    // but this is expected as if it would have a similarity from tokens that have
    // been added, it would be an inconsistency in the template
    const similarToken = targetTokens.find((targetToken) => {
      if (targetToken.type !== oldToken.type) {
        return false;
      }

      const isSameName = targetToken.name === oldToken.name;

      if (tokenResolution === "reuse-by-name") {
        return isSameName;
      }

      const isSameValue =
        derefToken(targetTokens, targetToken) ===
        derefToken(oldTokens, oldToken);

      if (tokenResolution === "reuse-by-value") {
        return isSameValue;
      }

      // We fallback to retain-by-value-and-name
      return isSameValue && isSameName;
    });

    if (similarToken) {
      oldToNewToken.set(oldToken, similarToken);
      return similarToken;
    }

    const tplMgr = new TplMgr({ site: targetSite });
    const newToken = tplMgr.addToken({
      name: tplMgr.getUniqueTokenName(oldToken.name),
      tokenType: oldToken.type as TokenType,
      value: derefToken(oldTokens, oldToken),
    });

    if (screenVariant) {
      // We get a single varianted value that we can keep for the screenVariant
      const variantedValues = oldToken.variantedValues.find((v) => {
        return v.variants.length === 1 && isScreenVariant(v.variants[0]);
      });
      if (variantedValues) {
        newToken.variantedValues.push(
          new VariantedValue({
            value: derefToken(
              oldTokens,
              oldToken,
              new VariantedStylesHelper(sourceSite, variantedValues.variants)
            ),
            variants: [screenVariant],
          })
        );
      }
    }

    oldToNewToken.set(oldToken, newToken);
    return newToken;
  }

  function fixTokensInTplTree(tplTree: TplNode) {
    if (!tokenResolution || tokenResolution === "inline") {
      inlineTokens(tplTree, sourceTokens, onFontSeen);
      return;
    }

    function getNewMaybeTokenRefValue(value: string) {
      if (!hasTokenRefs(value)) {
        return value;
      }

      return replaceAllTokenRefs(value, (tokenId) => {
        const oldToken = sourceTokens.find((t) => t.uuid === tokenId);
        if (!oldToken) {
          return undefined;
        }
        return mkTokenRef(getOrAddToken(sourceTokens, oldToken));
      });
    }

    const vsAndTpls = [...findVariantSettingsUnderTpl(tplTree)];
    for (const [vs, tpl] of vsAndTpls) {
      const forTag = isKnownTplTag(tpl) ? tpl.tag : "div";
      const rsHelper = new RuleSetHelpers(vs.rs, forTag);

      // Iterate over all Rules to resolve token refs
      for (const prop of rsHelper.props()) {
        const val = rsHelper.getRaw(prop);
        if (val) {
          const newVal = getNewMaybeTokenRefValue(val);
          rsHelper.set(prop, newVal);
          if (prop === "font-family") {
            onFontSeen(
              derefTokenRefs(
                [...targetTokens, ...oldToNewToken.values()],
                newVal
              )
            );
          }
        }
      }
    }
  }

  return fixTokensInTplTree;
}

/**
 * Clones the tree starting at the root of info.component
 * Makes it suitable for insertion
 */
export function cloneInsertableTemplate(
  site: Site,
  info: InsertableTemplateExtraInfo,
  targetBaseVariant: Variant,
  plumeSite: Site | undefined,
  ownerComponent: Component
) {
  const {
    component: sourceComp,
    site: sourceSite,
    screenVariant,
    resolution,
  } = info;

  const newTplTree = cloneTpl(sourceComp.tplTree);
  const assetFixer = makeImageAssetFixer(
    site,
    siteToAllImageAssetsDict(info.site)
  );
  const seenFonts = new Set<string>();

  /**
   * Note: We do all inlining at insertion time because
   * components are reused in TplComponent.
   * Thus, inlining at Studio load time would prevent us
   * from applying slot args properly
   */
  // Slots first - want to avoid nested slots
  inlineSlots(newTplTree);
  // Clone component instances recursively
  const ctx: InlineComponentContext = {
    sourceComp,
    sourceSite,
    targetSite: site,
    targetBaseVariant,
    extraInfo: info,
    plumeSite,
  };

  const oldTokens = allStyleTokens(sourceSite, { includeDeps: "all" });
  const newTokens = allStyleTokens(site, { includeDeps: "all" });

  const tokenImporter = mkInsertableTokenImporter(
    ctx.sourceSite,
    ctx.targetSite,
    oldTokens,
    newTokens,
    resolution.token,
    screenVariant,
    (font) => seenFonts.add(font)
  );

  if (resolution.component === "duplicate") {
    const componentImporter = mkInsertableComponentImporter(
      site,
      info,
      plumeSite,
      tokenImporter
    );
    for (const tpl of flattenTpls(newTplTree)) {
      if (isTplComponent(tpl)) {
        const newComp = componentImporter(tpl.component, tpl);
        const swapper = makeComponentSwapper(
          ctx.targetSite,
          tpl.component,
          newComp
        );
        swapper(tpl, ownerComponent);
      }
    }
  } else {
    inlineComponents(newTplTree, ctx);
  }
  // Apply all mixins and tokens
  // Note - if you call this earlier, you may not get into the component instances
  inlineMixins(newTplTree);
  tokenImporter(newTplTree);
  assertValidInsertable(newTplTree, resolution.component === "duplicate");

  // Traverse all VariantSettings
  for (const tpl of flattenTpls(newTplTree)) {
    ensureTplWithBaseAndScreenVariants(
      sourceComp,
      tpl,
      targetBaseVariant,
      screenVariant
    );

    for (const vs of tpl.vsettings) {
      assetFixer(tpl, vs);
      fixVariantSettingAttrs(vs);

      if (isTypographyNode(tpl)) {
        const rsh = RSH(vs.rs, tpl);
        const rawFont = rsh.getRaw("font-family");
        if (rawFont) {
          seenFonts.add(
            resolveAllTokenRefs(rawFont, [...oldTokens, ...newTokens])
          );
        }
      }

      if (isTplTextBlock(tpl)) {
        fixTextTplStyles(tpl, vs, oldTokens, sourceComp, sourceSite);
      }

      // Wipe out remaining arguments (Should have been flattened by now)
      // if it's a plume component or a code-component we keep the information
      // or we aren't importing the components
      const shouldRemoveArgs =
        !isTplComponent(tpl) ||
        (!isPlumeComponent(tpl.component) &&
          !isCodeComponent(tpl.component) &&
          resolution.component !== "duplicate");
      if (shouldRemoveArgs) {
        vs.args = [];
      }
    }
  }

  return { tpl: newTplTree, seenFonts };
}

function fixGlobalVariants(
  tpl: TplNode,
  vs: VariantSetting,
  opts: {
    screenVariant: Variant | undefined;
  }
) {
  if (vs.variants.some((v) => isGlobalVariant(v))) {
    vs.variants = withoutNils(
      vs.variants.map((v) => {
        if (isScreenVariant(v) && opts.screenVariant) {
          return opts.screenVariant;
        } else if (isGlobalVariant(v)) {
          return undefined;
        } else {
          return v;
        }
      })
    );

    // If we end up with a empty variants list,
    // or one with duplicates, then we remove from the list of vsettings
    if (
      vs.variants.length === 0 ||
      tpl.vsettings.some(
        (vs2) => vs2 !== vs && arrayEqIgnoreOrder(vs2.variants, vs.variants)
      )
    ) {
      remove(tpl.vsettings, vs);
    }
  }
}

function makeImageAssetFixer(
  site: Site,
  allImageAssetsDict: Record<string, ImageAsset>
) {
  const tplMgr = new TplMgr({ site: site });

  const oldToNew = new Map<ImageAsset, ImageAsset>();
  const getImageAsset = (asset: ImageAsset) => {
    if (!asset.dataUri) {
      return undefined;
    }

    if (oldToNew.has(asset)) {
      return oldToNew.get(asset)!;
    }
    const newAsset = tplMgr.addImageAsset({
      name: asset.type === ImageAssetType.Icon ? "icon" : "image",
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      dataUri: asset.dataUri,
      type:
        asset.type === ImageAssetType.Icon
          ? ImageAssetType.Icon
          : ImageAssetType.Picture,
      aspectRatio: asset.aspectRatio ?? undefined,
    });
    oldToNew.set(asset, newAsset);
    return newAsset;
  };

  return (tpl: TplNode, vs: VariantSetting) => {
    for (const [attr, expr] of [...Object.entries(vs.attrs)]) {
      if (isKnownImageAssetRef(expr)) {
        const newAsset = getImageAsset(expr.asset);
        if (newAsset) {
          vs.attrs[attr] = new ImageAssetRef({ asset: newAsset });
        } else {
          delete vs.attrs[attr];
        }
      }
    }

    for (const [prop, arg] of [...Object.entries(vs.args)]) {
      if (isKnownImageAssetRef(arg.expr)) {
        const newAsset = getImageAsset(arg.expr.asset);
        if (newAsset) {
          arg.expr = new ImageAssetRef({ asset: newAsset });
        } else {
          delete vs.args[prop];
        }
      }
    }

    fixBackgroundImage(tpl, vs, allImageAssetsDict, getImageAsset);
  };
}
