import { Component, ProjectDependency, Site, Variant } from "@/wab/classes";
import { ensure, maybe } from "@/wab/common";
import { PageComponent } from "@/wab/components";
import {
  flattenInsertableTemplatesByType,
  InsertableTemplatesGroup,
  InsertableTemplatesItem,
} from "@/wab/devflags";
import {
  cloneInsertableTemplate,
  InsertableTemplateExtraInfo,
} from "@/wab/shared/insertable-templates";
import { PkgInfo } from "@/wab/shared/SharedApi";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBaseVariant } from "@/wab/shared/Variants";
import { unbundleProjectDependency } from "@/wab/tagged-unbundle";
import { flatten, fromPairs } from "lodash";
import { promptChooseItem } from "./components/modals/ChooseItemModal";
import { normalizeTemplateSpec, StudioCtx } from "./studio-ctx/StudioCtx";

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

export const getPageTemplates = (studioCtx: StudioCtx) => {
  const pageTemplates = flatten(
    getPageTemplatesGroups(studioCtx).map((g) => g.items)
  ).filter((i) => i.type === "insertable-templates-item");
  return pageTemplates as InsertableTemplatesItem[];
};

export const getPageTemplate = (
  studioCtx: StudioCtx,
  projectId: string,
  componentName: string
) => {
  const pageTemplates = getPageTemplates(studioCtx);
  const pageTemplate = pageTemplates.find(
    (tmpl) =>
      tmpl.projectId === projectId && tmpl.componentName === componentName
  );
  return pageTemplate;
};

export const getInsertablePageTemplateComponent = (
  studioCtx: StudioCtx,
  chosenTemplate: {
    componentName?: string;
    projectId?: string;
  }
) => {
  if (!chosenTemplate.componentName || !chosenTemplate.projectId) {
    return;
  }

  const pageTemplate = getPageTemplate(
    studioCtx,
    chosenTemplate.projectId,
    chosenTemplate.componentName
  );
  if (!pageTemplate) {
    return;
  }

  const it =
    studioCtx.projectDependencyManager.getInsertableTemplate(pageTemplate);
  if (!it) {
    return;
  }

  return it;
};

export const replaceWithPageTemplate = (
  studioCtx: StudioCtx,
  page: PageComponent,
  templateInfo: InsertableTemplateExtraInfo
) => {
  const { tpl: toBeInserted, seenFonts } = cloneInsertableTemplate(
    studioCtx.site,
    templateInfo,
    getBaseVariant(page),
    studioCtx.projectDependencyManager.plumeSite
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

export const getVariantsToInsertableTemplate = async (
  studioCtx: StudioCtx,
  component: Component
) => {
  const baseVariant = getBaseVariant(component);
  const { screenVariant } = await getScreenVariantToInsertableTemplate(
    studioCtx
  );
  return {
    baseVariant,
    screenVariant,
  };
};

export const getHostLessDependenciesToInsertableTemplate = async (
  studioCtx: StudioCtx,
  sourceSite: Site
) => {
  const appCtx = studioCtx.appCtx;
  const hostLessProjectIds = sourceSite.projectDependencies
    .filter((dep) => dep.site.hostLessPackageInfo)
    .map((dep) => dep.projectId);
  const hostLessDependencies = fromPairs(
    await Promise.all(
      hostLessProjectIds.map(async (hostLessProjectId) => {
        const { pkg: maybePkg } = await appCtx.api.getPkgByProjectId(
          hostLessProjectId
        );
        const pkg = ensure(maybePkg, "Hostless package should exist");
        const { pkg: latest, depPkgs } = await appCtx.api.getPkgVersion(pkg.id);
        const { projectDependency } = unbundleProjectDependency(
          studioCtx.bundler(),
          latest,
          depPkgs
        );
        return [
          hostLessProjectId,
          {
            pkg,
            projectDependency,
          },
        ] as [
          string,
          {
            pkg: PkgInfo;
            projectDependency: ProjectDependency;
          }
        ];
      })
    )
  );

  return {
    hostLessDependencies,
  };
};

export async function buildInsertableExtraInfo(
  studioCtx: StudioCtx,
  projectId: string,
  componentName: string,
  screenVariant: Variant | undefined
): Promise<InsertableTemplateExtraInfo | undefined> {
  await studioCtx.projectDependencyManager.fetchInsertableTemplate(projectId);

  const it = studioCtx.projectDependencyManager.getInsertableTemplate({
    projectId,
    componentName,
  });
  if (!it) {
    return undefined;
  }

  return {
    ...it,
    screenVariant,
    ...(await getHostLessDependenciesToInsertableTemplate(studioCtx, it.site)),
  };
}

export function getInsertableTemplateComponentItems(studioCtx: StudioCtx) {
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
