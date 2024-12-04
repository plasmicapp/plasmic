import { AppAuthProvider } from "@/wab/shared/ApiSchema";
import {
  ComponentGenHelper,
  SiteGenHelper,
} from "@/wab/shared/codegen/codegen-helpers";
import {
  exportIconAsset,
  exportPictureAsset,
} from "@/wab/shared/codegen/image-assets";
import { exportCustomFunctionConfig } from "@/wab/shared/codegen/react-p/custom-functions";
import { exportReactPlain } from "@/wab/shared/codegen/react-p/plain";
import { exportStyleTokens } from "@/wab/shared/codegen/style-tokens";
import { ExportOpts, ProjectConfig } from "@/wab/shared/codegen/types";
import { exportGlobalVariantGroup } from "@/wab/shared/codegen/variants";
import {
  exportCodeComponentConfig,
  isCodeComponent,
  isFrameComponent,
  isHostLessCodeComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { CssVarResolver } from "@/wab/shared/core/styles";
import { Component, Site } from "@/wab/shared/model/classes";
import { computeSerializerSiteContext, exportReactPresentational } from ".";

export function exportSiteComponents(
  site: Site,
  opts: {
    scheme: "blackbox" | "plain";
    projectConfig: ProjectConfig;
    componentIdOrNames?: string[];
    componentExportOpts: ExportOpts;
    s3ImageLinks: Record<string, string>;
    imagesToFilter: Set<string>;
    includePages: boolean;
    isPlasmicHosted: boolean;
    forceAllCsr: boolean;
    appAuthProvider?: AppAuthProvider;
  }
) {
  const {
    scheme,
    projectConfig,
    componentIdOrNames,
    componentExportOpts,
    s3ImageLinks,
    imagesToFilter,
    includePages,
    isPlasmicHosted,
    forceAllCsr,
    appAuthProvider,
  } = opts;

  const siteGenHelper = new SiteGenHelper(site, false);
  const siteCtx = computeSerializerSiteContext(site);

  const cssVarResolver = new CssVarResolver(
    siteGenHelper.allStyleTokens(),
    siteGenHelper.allMixins(),
    siteGenHelper.allImageAssets(),
    site.activeTheme,
    {
      keepAssetRefs: ["files", "public-files"].includes(
        opts.componentExportOpts.imageOpts.scheme
      ),
      useCssVariables: true,
    }
  );

  // When componentIdOrNames is not specified, we don't sync component whose
  // name starts with "_".
  const includeComponent = (c: Component) => {
    if (isFrameComponent(c)) {
      return false;
    }
    if (isCodeComponent(c)) {
      if (isHostLessCodeComponent(c)) {
        return componentExportOpts.hostLessComponentsConfig === "stub";
      } else if (!opts.componentExportOpts.codeComponentStubs) {
        return false;
      }
    }
    if (!includePages && isPageComponent(c)) {
      return false;
    }
    if (c.name.startsWith("_")) {
      return false;
    }
    if (componentIdOrNames) {
      return (
        componentIdOrNames.includes(c.uuid) ||
        componentIdOrNames.includes(c.name)
      );
    }

    return true;
  };

  const components = site.components.filter(includeComponent);

  const genComponentBundle = (component: Component) => {
    const componentGenHelper = new ComponentGenHelper(
      siteGenHelper,
      cssVarResolver
    );
    if (scheme === "blackbox") {
      return exportReactPresentational(
        componentGenHelper,
        component,
        site,
        projectConfig,
        s3ImageLinks,
        isPlasmicHosted,
        forceAllCsr,
        appAuthProvider,
        componentExportOpts,
        siteCtx
      );
    } else {
      return exportReactPlain(
        component,
        site,
        projectConfig,
        componentExportOpts,
        siteCtx
      );
    }
  };

  const componentBundles = components.map((c) => {
    return genComponentBundle(c);
  });

  const codeComponentMetas = site.components
    .filter(isCodeComponent)
    .map(exportCodeComponentConfig);

  const customFunctionMetas = site.customFunctions.map((customFunction) =>
    exportCustomFunctionConfig(customFunction)
  );

  const globalVariantGroups = site.globalVariantGroups.filter(
    (g) => g.variants.length > 0
  );
  const globalVariantBundles = [...globalVariantGroups].map((vg) => {
    return exportGlobalVariantGroup(vg, componentExportOpts);
  });
  const tokens = exportStyleTokens(projectConfig.projectId, site);
  const iconAssets = site.imageAssets
    .filter((x) => x.type === ImageAssetType.Icon && x.dataUri)
    .map((x) => {
      return exportIconAsset(x, componentExportOpts);
    });
  const imageAssets =
    componentExportOpts.imageOpts.scheme !== "cdn"
      ? site.imageAssets
          .filter(
            (x) =>
              x.type === ImageAssetType.Picture &&
              x.dataUri &&
              !imagesToFilter.has(x.uuid)
          )
          .map((x) => {
            return exportPictureAsset(x, componentExportOpts);
          })
      : [];

  return {
    componentBundles,
    codeComponentMetas,
    customFunctionMetas,
    globalVariantBundles,
    tokens,
    iconAssets,
    imageAssets,
  };
}
