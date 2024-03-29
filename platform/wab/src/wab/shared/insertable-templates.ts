import { Component, Site, TplNode, Variant } from "@/wab/classes";
import { withoutNils } from "@/wab/common";
import { allComponentVariants } from "@/wab/components";
import {
  importComponentsInTree,
  mkInsertableComponentImporter,
} from "@/wab/shared/insertable-templates/component-importer";
import {
  assertValidInsertable,
  ensureValidUnownedTree,
  makeImageAssetFixer,
  mkInsertableTokenImporter,
  mkTextTplStyleFixer,
} from "@/wab/shared/insertable-templates/fixers";
import {
  inlineComponents,
  inlineSlots,
  inlineTokens,
} from "@/wab/shared/insertable-templates/inliners";
import {
  CopyStateExtraInfo,
  InlineComponentContext,
  InsertableTemplateExtraInfo,
} from "@/wab/shared/insertable-templates/types";
import { VariantCombo } from "@/wab/shared/Variants";
import { allGlobalVariants, allStyleTokens } from "@/wab/sites";
import {
  clone as cloneTpl,
  flattenTpls,
  flattenTplsBottomUp,
} from "@/wab/tpls";
import { siteToAllImageAssetsDict } from "./cached-selectors";

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

export function getUnownedTreeCloneUtils(
  site: Site,
  info: InsertableTemplateExtraInfo,
  targetBaseVariant: Variant,
  plumeSite: Site | undefined,
  ownerComponent: Component
) {
  const assetFixer = makeImageAssetFixer(
    site,
    siteToAllImageAssetsDict(info.site)
  );

  const oldTokens = allStyleTokens(info.site, { includeDeps: "all" });
  const newTokens = allStyleTokens(site, { includeDeps: "all" });

  const textTplStyleFixer = mkTextTplStyleFixer(
    oldTokens,
    info.component,
    info.site
  );

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
    assetFixer,
    componentImporter,
    textTplStyleFixer,
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

  const {
    assetFixer,
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
      fixAssets: assetFixer,
      fixTextTplStyles: textTplStyleFixer,
    }
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
    assetFixer,
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

      ensureValidUnownedTree(
        tplTree,
        {
          baseVariant: targetBaseVariant,
          screenVariant: info.screenVariant,
        },
        {
          resolveTokens: tokenImporter,
          fixAssets: assetFixer,
          fixTextTplStyles: textTplStyleFixer,
        }
      );

      // The order actually matters for importing components, the fixes in the tree assume
      // that the information in the tree is pointing to the original site, if we swap the
      // components before, tplTree may be inconsistent which can break the fixes
      importComponentsInTree(site, tplTree, ownerComponent, componentImporter);

      nodesToPaste.push(tplTree);
    }
  }

  return {
    nodesToPaste,
    seenFonts,
  };
}
