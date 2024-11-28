import { TplMgr } from "@/wab/shared/TplMgr";
import { getBaseVariant } from "@/wab/shared/Variants";
import { siteToAllImageAssetsDict } from "@/wab/shared/cached-selectors";
import { isBuiltinCodeComponent } from "@/wab/shared/code-components/builtin-code-components";
import { assert, ensure } from "@/wab/shared/common";
import {
  cloneComponent,
  isCodeComponent,
  isHostLessCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { allComponents } from "@/wab/shared/core/sites";
import { flattenTpls, isTplComponent } from "@/wab/shared/core/tpls";
import {
  ensureValidClonedComponent,
  makeImageAssetFixer,
} from "@/wab/shared/insertable-templates/fixers";
import { ensureHostLessDepComponent } from "@/wab/shared/insertable-templates/inliners";
import { HostLessDependencies } from "@/wab/shared/insertable-templates/types";
import {
  Component,
  ComponentTemplateInfo,
  Site,
  TplComponent,
  TplNode,
  Variant,
} from "@/wab/shared/model/classes";
import { makeComponentSwapper } from "@/wab/shared/swap-components";

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

    // Recursively fixup subcomps
    for (const component of comp.subComps) {
      fixupComp(component);
    }
  };

  const getNewComponent = (comp: Component, tpl?: TplComponent) => {
    if (oldToNewComponent.has(comp)) {
      return oldToNewComponent.get(comp)!;
    }

    if (isBuiltinCodeComponent(comp)) {
      // We need to check for builtin code components as they need to point to the same
      // instance present in the site
      const existing = site.components.find(
        (c) => isHostLessCodeComponent(c) && c.name === comp.name
      );
      if (existing) {
        oldToNewComponent.set(comp, existing);
        return existing;
      }
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
      const existing = site.components.find(
        (c) => c.plumeInfo?.type === comp.plumeInfo?.type
      );
      if (existing) {
        oldToNewComponent.set(comp, existing);
        return existing;
      }

      const plumeComp = new TplMgr({ site }).clonePlumeComponent(
        info.site,
        comp.uuid,
        comp.name,
        true
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

    if (!isDirectSourceComponent) {
      // We need to check if the component is present as a dependency
      const allSiteComponents = allComponents(site, {
        includeDeps: "all",
      });
      const sourceComp = allSiteComponents.find((c) => c.uuid === comp.uuid);
      if (sourceComp) {
        // The project already has the same dependency, as the origin site
        // so we can just reuse it, the version may be different, but we won't
        // worry about it here, the component-swapper will handle the adaptation.
        // Later when the user upgrades the dependency, the component will be updated
        oldToNewComponent.set(comp, sourceComp);
        return sourceComp;
      }

      const missingDependency = ensure(
        walkDependencyTree(info.site, "all").find((dep) =>
          dep.site.components.some((c) => c.uuid === comp.uuid)
        ),
        "Cannot find dependency for component"
      );

      // If the dependency is not present, we won't be able to link it
      throw new Error(
        `Cannot clone imported component ${comp.name} from "${missingDependency.name}".\n Please import the project ["${missingDependency.name}"](https://studio.plasmic.app/projects/${missingDependency.projectId}) first.`
      );
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
    newComp.name = tplMgr.getUniqueComponentName(newComp.name);
    tplMgr.attachComponent(newComp, comp, info.site);
    return newComp;
  };

  return getNewComponent;
}
