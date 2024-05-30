import { Site } from "@/wab/classes";
import { jsonClone } from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import {
  exportProjectConfig,
  exportStyleConfig,
} from "@/wab/shared/codegen/react-p";
import { exportSiteComponents } from "@/wab/shared/codegen/react-p/gen-site-bundle";
import { initBuiltinActions } from "@/wab/states";
import { deepTrackComponents } from "@/wab/tpls";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import process from "process";
import { promisify } from "util";

export async function codegen(dir: string, site: Site) {
  console.log("Codegen output dir", dir);
  initBuiltinActions({
    projectId: "project",
    platform: "react",
    projectFlags: jsonClone(DEVFLAGS),
    inStudio: false,
  });
  deepTrackComponents(site);

  const importFromProject = (filePath: string) =>
    import(path.join(dir, filePath));

  // First, export all the things we need
  const projectConfig = exportProjectConfig(
    site,
    "Project",
    "project",
    10,
    "10",
    "latest",
    {
      platform: "react",
      relPathFromImplToManagedDir: ".",
      relPathFromManagedToImplDir: ".",
      targetEnv: "codegen",
    }
  );
  const defaultStylesBundle = exportStyleConfig({ targetEnv: "codegen" });
  const { componentBundles, globalVariantBundles, iconAssets } =
    exportSiteComponents(site, {
      scheme: "blackbox",
      projectConfig,
      componentExportOpts: {
        lang: "ts",
        platform: "react",
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
      },
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

  return importFromProject;
}
