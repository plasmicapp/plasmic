import { FrameViewMode, mkArenaFrame } from "@/wab/shared/Arenas";
import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantCombo } from "@/wab/shared/Variants";
import { siteToAllImageAssetsDict } from "@/wab/shared/cached-selectors";
import { withoutNils } from "@/wab/shared/common";
import { allComponentVariants } from "@/wab/shared/core/components";
import { allGlobalVariants, allStyleTokens } from "@/wab/shared/core/sites";
import {
  clone as cloneTpl,
  flattenTpls,
  flattenTplsBottomUp,
} from "@/wab/shared/core/tpls";
import {
  importComponentsInTree,
  mkInsertableComponentImporter,
} from "@/wab/shared/insertable-templates/component-importer";
import {
  assertValidInsertable,
  ensureValidUnownedTree,
  getInvalidComponentNames,
  makeImageAssetFixer,
  mkInsertableTokenImporter,
  mkTextTplStyleFixer,
} from "@/wab/shared/insertable-templates/fixers";
import {
  inlineComponents,
  inlineSlots,
} from "@/wab/shared/insertable-templates/inliners";
import {
  CopyStateExtraInfo,
  InlineComponentContext,
  InsertableTemplateArenaExtraInfo,
  InsertableTemplateComponentExtraInfo,
} from "@/wab/shared/insertable-templates/types";
import { Component, Site, TplNode, Variant } from "@/wab/shared/model/classes";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";

export function cloneInsertableTemplateArena(
  site: Site,
  info: InsertableTemplateArenaExtraInfo,
  plumeSite: Site | undefined
) {
  const { arena } = info;
  const tplMgr = new TplMgr({ site });
  let newFonts = new Set<string>();
  const newArena = tplMgr.addArena(arena.name);
  arena.children.forEach((c) => {
    const { component, seenFonts } = cloneInsertableTemplateComponent(
      site,
      {
        ...info,
        component: c.container.component,
      },
      plumeSite
    );

    const newVariants = [
      ...component.variantGroups.flatMap((vg) => vg.variants),
      ...component.variants,
    ];

    newFonts = new Set([...newFonts, ...seenFonts]);
    newArena.children.push(
      mkArenaFrame({
        site,
        name: c.name,
        component,
        width: c.width,
        height: c.height,
        top: c.top ?? 0,
        left: c.left ?? 0,
        viewMode: FrameViewMode[c.viewMode],
        targetVariants: withoutNils(
          c.targetVariants.map((v) =>
            newVariants.find((nv) => nv.name === v.name)
          )
        ),
        pinnedVariants: {},
        targetGlobalVariants: [],
        pinnedGlobalVariants: {},
      })
    );
  });

  return { arena: newArena, seenFonts: newFonts };
}

/**
 * @param site Target site to clone the component
 * @param info Information about the handling of the component together with the origin site
 * and a reference to the component to clone
 * @param plumeSite Plume site to use for importing plume components
 * @returns a cloned component which is already attached to the target site and seen fonts
 * which the component depends on
 */
export function cloneInsertableTemplateComponent(
  site: Site,
  info: InsertableTemplateComponentExtraInfo,
  plumeSite: Site | undefined
) {
  const seenFonts = new Set<string>();

  const targetTokens = allStyleTokens(site, { includeDeps: "all" });
  const sourceTokens = allStyleTokens(info.site, {
    includeDeps: "all",
  });

  const tokenImporter = mkInsertableTokenImporter(
    info.site,
    site,
    sourceTokens,
    targetTokens,
    info.resolution.token,
    info.screenVariant,
    (font) => seenFonts.add(font)
  );

  const componentImporter = mkInsertableComponentImporter(
    site,
    info,
    plumeSite,
    tokenImporter
  );

  return { component: componentImporter(info.component), seenFonts };
}

export function getUnownedTreeCloneUtils(
  site: Site,
  info: InsertableTemplateComponentExtraInfo,
  targetBaseVariant: Variant,
  plumeSite: Site | undefined,
  ownerComponent: Component
) {
  const { getNewImageAsset, tplAssetFixer } = makeImageAssetFixer(
    site,
    siteToAllImageAssetsDict(info.site)
  );

  const oldTokens = allStyleTokens(info.site, { includeDeps: "all" });
  const newTokens = allStyleTokens(site, { includeDeps: "all" });

  const textTplStyleFixer = mkTextTplStyleFixer(info.component, info.site);

  const seenFonts = new Set<string>();
  const tokenImporter = mkInsertableTokenImporter(
    info.site,
    site,
    oldTokens,
    newTokens,
    info.resolution.token,
    info.screenVariant,
    (font) => seenFonts.add(font)
  );

  const componentImporter = mkInsertableComponentImporter(
    site,
    info,
    plumeSite,
    tokenImporter
  );

  return {
    componentImporter,
    textTplStyleFixer,
    tplAssetFixer,
    getNewImageAsset,
    tokenImporter,
    seenFonts,
    oldTokens,
    newTokens,
  };
}

/**
 * Clones the tree starting at the root of info.component
 * Makes it suitable for insertion
 */
export function cloneInsertableTemplate(
  site: Site,
  info: InsertableTemplateComponentExtraInfo,
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

  const {
    getNewImageAsset,
    tplAssetFixer,
    componentImporter,
    textTplStyleFixer,
    tokenImporter,
    seenFonts,
  } = getUnownedTreeCloneUtils(
    site,
    info,
    targetBaseVariant,
    plumeSite,
    ownerComponent
  );

  const isImportMode =
    resolution.component === "reuse" ||
    resolution.component === "duplicate" ||
    resolution.component === "import";

  const newTplTree = cloneTpl(sourceComp.tplTree);

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

  if (!isImportMode) {
    inlineComponents(newTplTree, ctx);
  }

  ensureValidUnownedTree(
    newTplTree,
    {
      baseVariant: targetBaseVariant,
      screenVariant,
    },
    {
      resolveTokens: tokenImporter,
      tplAssetFixer,
      fixTextTplStyles: textTplStyleFixer,
      getNewImageAsset,
    },
    getInvalidComponentNames(sourceComp, false)
  );

  if (isImportMode) {
    importComponentsInTree(
      ctx.targetSite,
      newTplTree,
      ownerComponent,
      componentImporter
    );
  }

  assertValidInsertable(newTplTree, isImportMode);

  return { tpl: newTplTree, seenFonts };
}

export function cloneCopyState(
  site: Site,
  info: CopyStateExtraInfo,
  targetBaseVariant: Variant,
  plumeSite: Site | undefined,
  ownerComponent: Component,
  adaptTplNodeForPaste: (
    tpl: TplNode,
    component: Component,
    activeVariants: VariantCombo
  ) => void
) {
  const {
    getNewImageAsset,
    tplAssetFixer,
    componentImporter,
    textTplStyleFixer,
    tokenImporter,
    seenFonts,
  } = getUnownedTreeCloneUtils(
    site,
    info,
    targetBaseVariant,
    plumeSite,
    ownerComponent
  );

  const componentTpls = flattenTpls(info.component.tplTree);

  const componentVariants = allComponentVariants(info.component, {
    includeSuperVariants: true,
  });

  const globalVariants = allGlobalVariants(info.site);

  const nodesToPaste: TplNode[] = [];

  // Only handle a single reference for now
  const reference = info.references[0];

  if (reference.type === "tpl-node") {
    const activeVariants = withoutNils(
      reference.activeVariantsUuids.map((uuid) => {
        const componentVariant = componentVariants.find(
          (variant) => variant.uuid === uuid
        );
        if (componentVariant) {
          return componentVariant;
        }
        return globalVariants.find((variant) => variant.uuid === uuid);
      })
    );

    const _tplTree = componentTpls.find((tpl) => tpl.uuid === reference.uuid);

    if (_tplTree) {
      const tplTree = cloneTpl(_tplTree);

      // Inline slots first to have a clean tree
      inlineSlots(tplTree);

      // First adjust the variants to match the active variants in base
      flattenTplsBottomUp(tplTree).forEach((tpl) => {
        adaptTplNodeForPaste(tpl, info.component, activeVariants);
      });

      // Collect invalid names to remove invalid references
      const invalidNames = getInvalidComponentNames(info.component, false);

      ensureValidUnownedTree(
        tplTree,
        {
          baseVariant: targetBaseVariant,
          screenVariant: info.screenVariant,
        },
        {
          resolveTokens: tokenImporter,
          tplAssetFixer,
          fixTextTplStyles: textTplStyleFixer,
          getNewImageAsset,
        },
        invalidNames
      );

      // The order actually matters for importing components, the fixes in the tree assume
      // that the information in the tree is pointing to the original site, if we swap the
      // components before, tplTree may be inconsistent which can break the fixes
      importComponentsInTree(site, tplTree, ownerComponent, componentImporter);

      nodesToPaste.push(tplTree);
    }
  }

  assertSiteInvariants(site);

  return {
    nodesToPaste,
    seenFonts,
  };
}
