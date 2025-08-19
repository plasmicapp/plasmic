import {
  exportProjectConfig,
  exportStyleConfig,
} from "@/wab/shared/codegen/react-p";
import { exportSiteComponents } from "@/wab/shared/codegen/react-p/gen-site-bundle";
import { ExportOpts } from "@/wab/shared/codegen/types";
import { jsonClone } from "@/wab/shared/common";
import { initBuiltinActions } from "@/wab/shared/core/states";
import { deepTrackComponents } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Site } from "@/wab/shared/model/classes";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import process from "process";
import { promisify } from "util";

export async function codegen(dir: string, site: Site) {
  console.log("Codegen output dir", dir);

  const projectId = "1234567890";
  const platform = "react";
  const targetEnv = "codegen";

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
    targetEnv,
  };

  initBuiltinActions({
    projectId,
    platform,
    projectFlags: jsonClone(DEVFLAGS),
    inStudio: false,
  });
  deepTrackComponents(site);

  const importFromProject = (filePath: string) =>
    import(path.join(dir, filePath));
  const readFromProject = (filePath: string) =>
    fs.readFileSync(path.join(dir, filePath), "utf8");

  // First, export all the things we need
  const projectConfig = exportProjectConfig(
    site,
    "Project",
    projectId,
    10,
    "10",
    "latest",
    exportOpts
  );
  const defaultStylesBundle = exportStyleConfig({ targetEnv });
  const { componentBundles, globalVariantBundles, iconAssets } =
    exportSiteComponents(site, {
      scheme: "blackbox",
      projectConfig,
      componentExportOpts: exportOpts,
      s3ImageLinks: {},
      imagesToFilter: new Set(),
      includePages: true,
      forceAllCsr: false,
      isPlasmicHosted: false,
    });

  // Write the bundles out to disk
  fs.writeFileSync(
    path.join(dir, defaultStylesBundle.defaultStyleCssFileName),
    defaultStylesBundle.defaultStyleCssRules
  );
  fs.writeFileSync(
    path.join(dir, projectConfig.cssFileName),
    projectConfig.cssRules
  );
  if (projectConfig.projectModuleBundle) {
    fs.writeFileSync(
      path.join(dir, projectConfig.projectModuleBundle.fileName),
      projectConfig.projectModuleBundle.module
    );
  }
  if (projectConfig.styleTokensProviderBundle) {
    fs.writeFileSync(
      path.join(dir, projectConfig.styleTokensProviderBundle.fileName),
      projectConfig.styleTokensProviderBundle.module
    );
  }

  for (const bundle of componentBundles) {
    fs.writeFileSync(
      path.join(dir, bundle.renderModuleFileName),
      bundle.renderModule
    );
    fs.writeFileSync(path.join(dir, bundle.cssFileName), bundle.cssRules);
    fs.writeFileSync(
      path.join(dir, bundle.skeletonModuleFileName),
      bundle.skeletonModule
    );
  }

  for (const bundle of globalVariantBundles) {
    fs.writeFileSync(
      path.join(dir, bundle.contextFileName),
      bundle.contextModule
    );
  }

  for (const bundle of iconAssets) {
    fs.writeFileSync(path.join(dir, bundle.fileName), bundle.module);
  }

  // Also create a tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "es5",
      lib: ["dom", "dom.iterable", "esnext"],
      jsx: "react",
      module: "esnext",
      moduleResolution: "node",
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      strict: true,
    },
  };

  fs.writeFileSync(
    path.join(dir, "tsconfig.json"),
    JSON.stringify(tsConfig, undefined, 2)
  );

  // Link node_modules against the wab node_modules...  so we don't have to yarn install
  // anything for tests :-p
  await promisify(exec)(
    `ln -s ${path.join(process.cwd(), "node_modules")} node_modules`,
    { cwd: dir }
  );

  try {
    // Compile ts to js
    await promisify(exec)("node_modules/.bin/tsc", { cwd: dir });
  } catch (err) {
    throw new Error(`Typescript compilation failed: ${err.stdout}`);
  }

  return { importFromProject, readFromProject };
}
