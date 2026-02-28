import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundle } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/data-tokens-page-meta.json";
import { generateSiteFromBundle } from "@/wab/shared/codegen/codegen-tests-util";
import { exportProjectConfig } from "@/wab/shared/codegen/react-p";
import { serializeGenerateMetadataFunction } from "@/wab/shared/codegen/react-p/page-metadata";
import { ExportOpts } from "@/wab/shared/codegen/types";
import { jsonClone } from "@/wab/shared/common";
import { initBuiltinActions } from "@/wab/shared/core/states";
import { deepTrackComponents } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import "core-js";

describe("data tokens: page meta codegen", () => {
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  it("should codegen correct metadata with data tokens", () => {
    // Generate metadata for the "seo" page component which uses data tokens
    const projectId = "3UYiEMfU3twU4iYSx86cub" as ProjectId;
    const platform = "nextjs";

    const exportOpts: ExportOpts = {
      lang: "ts",
      platform,
      relPathFromImplToManagedDir: ".",
      relPathFromManagedToImplDir: ".",
      forceAllProps: false,
      forceRootDisabled: false,
      imageOpts: { scheme: "inlined" },
      stylesOpts: { scheme: "css" },
      codeOpts: { reactRuntime: "classic" },
      fontOpts: { scheme: "import" },
      codeComponentStubs: false,
      skinnyReactWeb: false,
      skinny: false,
      importHostFromReactWeb: true,
      hostLessComponentsConfig: "package",
      useComponentSubstitutionApi: false,
      useGlobalVariantsSubstitutionApi: false,
      useCodeComponentHelpersRegistry: false,
      useCustomFunctionsStub: false,
      targetEnv: "codegen",
      platformOptions: {
        nextjs: {
          appDir: true,
        },
      },
    };

    initBuiltinActions({
      projectId,
      platform,
      projectFlags: jsonClone(DEVFLAGS),
      inStudio: false,
    });
    deepTrackComponents(site);

    // Find the component by name
    const component = site.components.find((c) => c.name === "seo");
    if (!component) {
      throw new Error(`Component "seo" not found in site`);
    }

    const projectConfig = exportProjectConfig(
      site,
      "Project",
      projectId,
      10,
      "10",
      "latest",
      exportOpts,
      false,
      "blackbox"
    );

    // Create a minimal SerializerBaseContext with only the fields needed for metadata generation
    const ctx: any = {
      site,
      component,
      exportOpts,
      projectConfig,
      projectFlags: DEVFLAGS,
      exprCtx: {
        component,
        projectFlags: DEVFLAGS,
        inStudio: false,
      },
      s3ImageLinks: {},
    };

    const metadataOutput = serializeGenerateMetadataFunction(ctx);

    expect(metadataOutput).toBeDefined();
    expect(metadataOutput?.fileName).toMatch(
      /^__generateMetadata_PlasmicSeo_[a-zA-Z0-9]{12}\.tsx$/
    );

    // Verify snapshot matches the generated metadata module
    expect(metadataOutput?.module).toMatchSnapshot();
  });
});
