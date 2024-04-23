import {
  Component,
  ComponentTemplateInfo,
  Site,
  TplComponent,
  TplNode,
  Variant,
} from "@/wab/classes";
import { assert, ensure } from "@/wab/common";
import {
  cloneComponent,
  isCodeComponent,
  isHostLessCodeComponent,
  isPlumeComponent,
} from "@/wab/components";
import { siteToAllImageAssetsDict } from "@/wab/shared/cached-selectors";
import {
  ensureValidClonedComponent,
  makeImageAssetFixer,
} from "@/wab/shared/insertable-templates/fixers";
import {
  ensureHostLessDepComponent,
  getSiteMatchingPlumeComponent,
} from "@/wab/shared/insertable-templates/inliners";
import { HostLessDependencies } from "@/wab/shared/insertable-templates/types";
import { makeComponentSwapper } from "@/wab/shared/swap-components";
import { TplMgr } from "@/wab/shared/TplMgr";
import { getBaseVariant } from "@/wab/shared/Variants";
import { flattenTpls, isTplComponent } from "@/wab/tpls";

interface OriginInfo {
  projectId: string;
  site: Site;
  screenVariant: Variant | undefined;
  hostLessDependencies: HostLessDependencies;
}

export type ComponentImporter = (
  comp: Component,
  tpl?: TplComponent
) => Component;

export function importComponentsInTree(
  targetSite: Site,
  tplTree: TplNode,
  ownerComponent: Component,
  importer: ComponentImporter
) {
  for (const tpl of flattenTpls(tplTree)) {
    if (isTplComponent(tpl)) {
      const newComp = importer(tpl.component, tpl);
      if (tpl.component === newComp) {
        // If the component is the same, there's no need to swap it
        continue;
      }
      const swapper = makeComponentSwapper(targetSite, tpl.component, newComp);
      swapper(tpl, ownerComponent);
    }
  }
}

// Returns a function to import a component from info.site also importing
// recursively all the components it depends on.
export function mkInsertableComponentImporter(
  site: Site,
  info: OriginInfo,
  plumeSite: Site | undefined,
  resolveTreeTokens: (tplTree: TplNode) => void
): ComponentImporter {
  const oldToNewComponent = new Map<Component, Component>();
  const { tplAssetFixer, getNewImageAsset } = makeImageAssetFixer(
    site,
    siteToAllImageAssetsDict(info.site)
  );
  const tplMgr = new TplMgr({ site });

  const fixupComp = (comp: Component) => {
    ensureValidClonedComponent(
      comp,
      {
        baseVariant: getBaseVariant(comp),
        screenVariant: info.screenVariant,
      },
      {
        getNewImageAsset,
        resolveTokens: resolveTreeTokens,
        tplAssetFixer,
      }
    );

    importComponentsInTree(site, comp.tplTree, comp, getNewComponent);
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
      // Perform fixes in the plume component as this may be a customized version
      // created by the user
      fixupComp(plumeComp);
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

    const isDirectSourceComponent = info.site.components.find(
      (c) => c.uuid === comp.uuid
    );

    assert(
      isDirectSourceComponent,
      () => `Cannot clone imported component ${comp.name}`
    );

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
