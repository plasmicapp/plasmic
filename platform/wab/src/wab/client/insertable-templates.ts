import { ViewOps } from "@/wab/client/components/canvas/view-ops";
import { promptChooseItem } from "@/wab/client/components/modals/ChooseItemModal";
import {
  StudioCtx,
  normalizeTemplateSpec,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { BranchId } from "@/wab/shared/ApiSchema";
import { PkgInfo, PkgVersionInfo } from "@/wab/shared/SharedApi";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBaseVariant } from "@/wab/shared/Variants";
import { FastBundler } from "@/wab/shared/bundler";
import { Bundle, getBundle } from "@/wab/shared/bundles";
import { assert, ensure, maybe, switchType } from "@/wab/shared/common";
import { PageComponent } from "@/wab/shared/core/components";
import {
  unbundleProjectDependency,
  unbundleSite,
} from "@/wab/shared/core/tagged-unbundle";
import { deepTrackComponents } from "@/wab/shared/core/tpls";
import {
  InsertableTemplateComponentResolution,
  InsertableTemplateTokenResolution,
  InsertableTemplatesGroup,
  InsertableTemplatesItem,
  flattenInsertableTemplatesByType,
} from "@/wab/shared/devflags";
import { cloneInsertableTemplate } from "@/wab/shared/insertable-templates";
import {
  CopyElementsReference,
  CopyState,
  CopyStateBundleRef,
  CopyStateExtraInfo,
  InsertableTemplateComponentExtraInfo,
} from "@/wab/shared/insertable-templates/types";
import {
  ArenaFrame,
  ProjectDependency,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
} from "@/wab/shared/model/classes";
import { Dictionary, flatten, fromPairs } from "lodash";

export const getPageTemplatesGroups = (studioCtx: StudioCtx) => {
  const insertableTemplates =
    maybe(studioCtx.getCurrentUiConfig()?.pageTemplates, (x) =>
      normalizeTemplateSpec(x, true)
    ) ?? studioCtx.appCtx.appConfig.insertableTemplates;
  if (!insertableTemplates) {
    return [];
  }
  const pageTemplatesGroups = insertableTemplates.items.filter(
    (i) => i.type === "insertable-templates-group" && i.isPageTemplatesGroup
  );
  return pageTemplatesGroups as InsertableTemplatesGroup[];
};

const getPageTemplates = (studioCtx: StudioCtx) => {
  const pageTemplates = flatten(
    getPageTemplatesGroups(studioCtx).map((g) => g.items)
  ).filter((i) => i.type === "insertable-templates-item");
  return pageTemplates as InsertableTemplatesItem[];
};

const getInsertableTemplatesGroups = (studioCtx: StudioCtx) => {
  const insertableTemplates =
    maybe(studioCtx.getCurrentUiConfig()?.insertableTemplates, (x) =>
      normalizeTemplateSpec(x, false)
    ) ?? studioCtx.appCtx.appConfig.insertableTemplates;
  if (!insertableTemplates) {
    return [];
  }
  const insertableTemplatesGrups = insertableTemplates.items.filter(
    (i) => i.type === "insertable-templates-group" && !i.isPageTemplatesGroup
  );
  return insertableTemplatesGrups as InsertableTemplatesGroup[];
};

const getInsertableTemplates = (studioCtx: StudioCtx) => {
  const insertableTemplates = flatten(
    getInsertableTemplatesGroups(studioCtx).map((g) => g.items)
  ).filter(
    (i) =>
      i.type === "insertable-templates-item" ||
      i.type === "insertable-templates-component"
  );
  return insertableTemplates as InsertableTemplatesItem[];
};

const getAllTemplates = (studioCtx: StudioCtx) => {
  return [...getInsertableTemplates(studioCtx), ...getPageTemplates(studioCtx)];
};

export const replaceWithPageTemplate = (
  studioCtx: StudioCtx,
  page: PageComponent,
  templateInfo: InsertableTemplateComponentExtraInfo
) => {
  const { tpl: toBeInserted, seenFonts } = cloneInsertableTemplate(
    studioCtx.site,
    templateInfo,
    getBaseVariant(page),
    studioCtx.projectDependencyManager.plumeSite,
    page
  );
  postInsertableTemplate(studioCtx, seenFonts);

  $$$(page.tplTree).replaceWith(toBeInserted);
};

export function postInsertableTemplate(
  studioCtx: StudioCtx,
  seenFonts: Set<string>
) {
  // hostless dependencies may have been updated
  studioCtx.projectDependencyManager.syncDirectDeps();

  // Add new fonts to font manager
  for (const font of seenFonts) {
    studioCtx.fontManager.useFont(studioCtx, font);
  }
}

/**
 * Example: Consider an insertable template component "Button".
 * Button has a width of 200px in Base variant. But a "Mobile Only" variant in the template component's project sets its width to 100%
 *
 * The origin project (the project that's importing the insertable template), on the other hand, does not have a "Mobile Only" variant. Instead, it has a responsive variant called "My Mobile".
 * The function below decides which screen variant in the origin project should we map "Mobile Only" to.
 *
 * @param studioCtx
 * @returns The current project (origin)'s screen variant, that can be used as a responsive breakpoint for the target (insertable template) component.
 *
 */
export const getScreenVariantToInsertableTemplate = async (
  studioCtx: StudioCtx
) => {
  const baseVariant = undefined;
  const site = studioCtx.site;
  const screenVariantGroup = site.activeScreenVariantGroup;
  if (studioCtx.projectDependencyManager.insertableSiteScreenVariant) {
    // If we remember the last choice we made
    return {
      baseVariant,
      screenVariant:
        studioCtx.projectDependencyManager.insertableSiteScreenVariant,
    };
  } else if (!screenVariantGroup || screenVariantGroup.variants.length <= 0) {
    // If there is no screen variants
    return {
      baseVariant,
      screenVariant: undefined,
    };
  } else if (screenVariantGroup.variants.length === 1) {
    // If there is only 1, so the mapping is obvious
    return {
      baseVariant,
      screenVariant: screenVariantGroup?.variants[0],
    };
  } else {
    // Ask the user which one to use
    const result = await promptChooseItem({
      title: "Choose a responsive breakpoint",
      description:
        "This template can be responsive to the screen size. Please choose which responsive breakpoint to use.",
      group: screenVariantGroup.variants.map((v) => {
        return {
          name: v.name,
          item: v,
        };
      }),
    });
    const screenVariant = result ? result.item : undefined;
    studioCtx.projectDependencyManager.insertableSiteScreenVariant =
      screenVariant;
    return {
      baseVariant,
      screenVariant,
    };
  }
};

export const getHostLessDependenciesToInsertableTemplate = async (
  studioCtx: StudioCtx,
  sourceSite: Site
): Promise<{
  hostLessDependencies: Dictionary<{
    pkg: PkgInfo;
    projectDependency: ProjectDependency;
  }>;
}> => {
  const appCtx = studioCtx.appCtx;
  const hostLessProjects = sourceSite.projectDependencies.filter(
    (dep) => dep.site.hostLessPackageInfo
  );
  const hostLessDependencies = fromPairs(
    await Promise.all(
      hostLessProjects.map(
        async ({
          projectId: hostLessProjectId,
          version: hostLessProjectVersion,
          pkgId: hostLessPkgId,
          name: hostLessPkgName,
        }) => {
          const dep = studioCtx.site.projectDependencies.find(
            (d) => d.projectId === hostLessProjectId
          );
          if (dep) {
            assert(
              dep.version === hostLessProjectVersion,
              `${dep.name} has version ${dep.version}, but expected ${hostLessProjectVersion}`
            );
            return [
              hostLessProjectId,
              {
                pkg: {
                  id: dep.pkgId,
                  name: dep.name,
                  projectId: dep.projectId,
                },
                projectDependency: dep,
              },
            ];
          }
          // You can't just use the projectDependency from the sourceSite, as it needs to be unbundled by studioCtx.bundler() to be usable here
          const { pkg: latest, depPkgs } = await appCtx.api.getPkgVersion(
            hostLessPkgId,
            hostLessProjectVersion
          );
          const { projectDependency } = unbundleProjectDependency(
            studioCtx.bundler(),
            latest,
            depPkgs
          );

          return [
            hostLessProjectId,
            {
              pkg: {
                id: hostLessPkgId,
                name: hostLessPkgName,
                projectId: hostLessProjectId,
              },
              projectDependency,
            },
          ];
        }
      )
    )
  );

  return {
    hostLessDependencies,
  };
};

export async function buildInsertableExtraInfo(
  studioCtx: StudioCtx,
  componentMeta: {
    projectId: string;
    componentName?: string;
    componentId?: string;
  },
  screenVariant: Variant | undefined
): Promise<InsertableTemplateComponentExtraInfo | undefined> {
  const { componentName, componentId, projectId } = componentMeta;

  if (!componentName && !componentId) {
    return undefined;
  }

  await studioCtx.projectDependencyManager.fetchInsertableTemplate(projectId);

  const it = studioCtx.projectDependencyManager.getInsertableTemplate({
    projectId,
    componentName,
    componentId,
  });
  if (!it) {
    return undefined;
  }

  const compName =
    componentName ??
    it.site.components.find((c) => c.uuid === componentId)?.name;

  const template = getAllTemplates(studioCtx).find(
    (c) => c.projectId === projectId && c.componentName === compName
  );

  return {
    ...it,
    screenVariant,
    ...(await getHostLessDependenciesToInsertableTemplate(studioCtx, it.site)),
    projectId,
    resolution: {
      token: template?.tokenResolution,
      component: template?.componentResolution,
    },
  };
}

function getInsertableTemplateComponentItems(studioCtx: StudioCtx) {
  return flattenInsertableTemplatesByType(
    studioCtx.appCtx.appConfig.insertableTemplates,
    "insertable-templates-component"
  );
}

export function getInsertableTemplateComponentItem(
  studioCtx: StudioCtx,
  templateName: string
) {
  return getInsertableTemplateComponentItems(studioCtx).find(
    (i) => i.templateName === templateName
  );
}

function createCopyableElementsReferences(
  viewCtx: ViewCtx,
  copyObj: NonNullable<ReturnType<ViewOps["copy"]>>
): CopyElementsReference[] {
  function tplNodeRef(node: TplNode): CopyElementsReference {
    const activeVariants = viewCtx
      .variantTplMgr()
      .getActivatedVariantsForNode(node);
    return {
      type: "tpl-node",
      uuid: node.uuid,
      activeVariantsUuids: [...activeVariants].map((v) => v.uuid),
    };
  }

  return (
    switchType(copyObj)
      // Copy paste will only handle single tplNodes for now
      .when(Array<TplTag | TplComponent | TplSlot>, () => [])
      .when(TplNode, (node) => [tplNodeRef(node)])
      .when(ArenaFrame, (frame) => {
        // We have some options here:
        // 1. Copy the entire frame as a frame
        // 2. Import the component which the frame is based on
        // 3. Copy the tree of the component
        // For now, the most natural thing to do is to copy the tree of the component
        const node = frame.container.component.tplTree;
        return [tplNodeRef(node)];
      })
      .result()
  );
}

export function getCopyState(
  viewCtx: ViewCtx,
  copyObj: NonNullable<ReturnType<ViewOps["copy"]>>
): CopyState {
  const references = createCopyableElementsReferences(viewCtx, copyObj);

  const currentComponent = viewCtx.currentComponent();

  const dbCtx = viewCtx.dbCtx();

  function getBundleRef(): CopyStateBundleRef {
    if (dbCtx.pkgVersionInfoMeta) {
      return {
        type: "pkg",
        // This is a stable package version, so the copy and paste will be stable
        pkgId: dbCtx.pkgVersionInfoMeta.pkgId,
        version: dbCtx.pkgVersionInfoMeta.version,
      };
    }
    return {
      type: "revision",
      // We include revisionNum so that we reference this exact state, but this
      // implies that eventually the copy state will reference a non existent
      // revision likely, but this is fine, copy and paste is not meant to be
      // take a long time
      revisionNum: dbCtx.revisionNum,
    };
  }

  const state: CopyState = {
    action: "cross-tab-copy",
    projectId: viewCtx.studioCtx.siteInfo.id,
    branchId: dbCtx.branchInfo?.id,
    bundleRef: getBundleRef(),
    componentUuid: currentComponent.uuid,
    componentName: currentComponent.name,
    references,
  };

  return state;
}

export function isCopyState(x: any): x is CopyState {
  return "action" in x && x.action === "cross-tab-copy";
}

async function resolveBundleRef(
  studioCtx: StudioCtx,
  state: CopyState
): Promise<{
  bundle: Bundle;
  depPkgs: PkgVersionInfo[];
}> {
  const ref = state.bundleRef;
  if (ref.type === "pkg") {
    const { pkg, depPkgs } = await studioCtx.appCtx.api.getPkgVersion(
      ref.pkgId,
      ref.version,
      state.branchId
    );
    return { bundle: pkg.model, depPkgs };
  }
  const { rev, depPkgs } = await studioCtx.appCtx.api.getSiteInfo(
    state.projectId,
    {
      revisionNum: ref.revisionNum,
      branchId: state.branchId as BranchId | undefined,
    }
  );
  return {
    bundle: getBundle(rev, studioCtx.appCtx.lastBundleVersion),
    depPkgs,
  };
}

export async function buildCopyStateExtraInfo(
  studioCtx: StudioCtx,
  state: CopyState
): Promise<CopyStateExtraInfo> {
  const { projectId, componentUuid, componentName, references, bundleRef } =
    state;

  const site = await studioCtx.app.withSpinner(
    (async () => {
      // TODO: For copy and paste to work, we are downloading the entire site info
      // for the project. This is not ideal and we should find a way to avoid this.

      const { bundle, depPkgs } = await resolveBundleRef(studioCtx, state);

      const bundler = new FastBundler();

      const { site: originSite } = unbundleSite(
        bundler,
        projectId,
        bundle,
        depPkgs
      );

      // Be sure to track it, so that we can properly to do some fixups
      // as effectiveVs may require `getTplOwnerComponent`
      deepTrackComponents(originSite);

      return originSite;
    })()
  );

  // Don't add spinner wrapper, as this may prompt the user to select a screen variant
  const { screenVariant } = await getScreenVariantToInsertableTemplate(
    studioCtx
  );

  // This hostless dependencies have been unbundled with the current studio
  // bundler which makes them compatible to be installed in the current site
  const { hostLessDependencies } = await studioCtx.app.withSpinner(
    getHostLessDependenciesToInsertableTemplate(studioCtx, site)
  );

  const resolution: {
    token?: InsertableTemplateTokenResolution;
    component?: InsertableTemplateComponentResolution;
  } = {
    token: "reuse-by-name",
    component: "reuse",
  };

  const component = ensure(
    site.components.find((c) => c.uuid === componentUuid),
    `Component "${componentName}" was not found to paste content`
  );

  return {
    projectId,
    site,
    screenVariant,
    hostLessDependencies,
    resolution,
    component,
    references,
  };
}
