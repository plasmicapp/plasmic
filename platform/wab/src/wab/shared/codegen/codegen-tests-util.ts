import { ProjectId } from "@/wab/shared/ApiSchema";
import {
  exportProjectConfig,
  exportStyleConfig,
} from "@/wab/shared/codegen/react-p";
import { exportSiteComponents } from "@/wab/shared/codegen/react-p/gen-site-bundle";
import {
  CodegenScheme,
  ExportOpts,
  ExportPlatform,
  ExportPlatformOptions,
  StylesScheme,
} from "@/wab/shared/codegen/types";
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

export async function codegen(
  dir: string,
  site: Site,
  opts: {
    platform: ExportPlatform;
    platformVersion?: string;
    codegenScheme: CodegenScheme;
    stylesScheme: StylesScheme;
    platformOptions?: ExportPlatformOptions;
    projectId?: ProjectId;
  } = {
    platform: "react",
    platformVersion: undefined,
    codegenScheme: "blackbox",
    stylesScheme: "css-modules",
  }
) {
  console.log(`Codegen output dir`, dir, opts);

  const projectId = opts.projectId ?? ("1234567890" as ProjectId);

  const exportOpts: ExportOpts = {
    lang: "ts",
    platform: opts.platform,
    platformVersion: opts.platformVersion,
    platformOptions: opts.platformOptions,
    relPathFromImplToManagedDir: ".",
    relPathFromManagedToImplDir: ".",
    forceAllProps: false,
    forceRootDisabled: false,
    imageOpts: { scheme: "inlined" },
    stylesOpts: { scheme: opts.stylesScheme },
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
  };

  initBuiltinActions({
    projectId,
    platform: opts.platform,
    projectFlags: jsonClone(DEVFLAGS),
    inStudio: false,
  });
  deepTrackComponents(site);

  const importFromProject = (filePath: string) =>
    import(path.join(dir, filePath));
  const readFromProject = (filePath: string) =>
    fs.readFileSync(path.join(dir, filePath), "utf8");
  const existsInProject = (filePath: string) =>
    fs.existsSync(path.join(dir, filePath));

  // First, export all the things we need
  const projectConfig = exportProjectConfig(
    site,
    "Project",
    projectId,
    10,
    "10",
    "latest",
    exportOpts,
    false,
    opts.codegenScheme
  );
  const defaultStylesBundle = exportStyleConfig(exportOpts);
  const { componentBundles, globalVariantBundles, iconAssets } =
    exportSiteComponents(site, {
      scheme: opts.codegenScheme,
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
  if (projectConfig.dataTokensBundle) {
    fs.writeFileSync(
      path.join(dir, projectConfig.dataTokensBundle.fileName),
      projectConfig.dataTokensBundle.module
    );
  }

  for (const bundle of componentBundles) {
    if (bundle.renderModuleFileName && bundle.renderModule) {
      fs.writeFileSync(
        path.join(dir, bundle.renderModuleFileName),
        bundle.renderModule
      );
    }
    fs.writeFileSync(path.join(dir, bundle.cssFileName), bundle.cssRules);
    fs.writeFileSync(
      path.join(dir, bundle.skeletonModuleFileName),
      bundle.skeletonModule
    );
    if (bundle.rscMetadata) {
      const { pageWrappers, serverQueriesExecFunc } = bundle.rscMetadata;
      if (serverQueriesExecFunc) {
        fs.writeFileSync(
          path.join(dir, serverQueriesExecFunc.fileName),
          serverQueriesExecFunc.module
        );
      }
      fs.writeFileSync(
        path.join(dir, pageWrappers.server.fileName),
        pageWrappers.server.module
      );
      fs.writeFileSync(
        path.join(dir, pageWrappers.client.fileName),
        pageWrappers.client.module
      );
    }
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
      target: "ES2015",
      lib: ["dom", "dom.iterable", "esnext"],
      jsx: "react",
      module: "esnext",
      moduleResolution: "bundler",
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      strict: true,
    },
  };
  fs.writeFileSync(
    path.join(dir, "tsconfig.json"),
    JSON.stringify(tsConfig, undefined, 2)
  );

  // Write type declarations to support CSS modules. Based on:
  // https://github.com/vercel/next.js/blob/canary/packages/next/types/global.d.ts
  fs.writeFileSync(
    path.join(dir, "global.d.ts"),
    `declare module '*.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}`
  );

  // Link node_modules against the wab node_modules...  so we don't have to yarn install
  // anything for tests :-p
  if (!fs.existsSync(path.join(dir, "node_modules"))) {
    await promisify(exec)(
      `ln -s ${path.join(process.cwd(), "node_modules")} node_modules`,
      { cwd: dir }
    );
  }

  if (opts.platform === "nextjs") {
    // Write type declarations for platform-specific modules not available in wab's node_modules
    fs.writeFileSync(
      path.join(dir, "externals.d.ts"),
      [
        "declare module 'next/link';",
        "declare module 'next/router';",
        "declare module 'next/navigation';",
        // Declare types from 'next' used in generated skeletons
        "declare module 'next' {",
        "  export type Metadata = Record<string, unknown>;",
        "  export type ResolvingMetadata = Promise<Metadata>;",
        "}",
      ].join("\n")
    );
  }
  try {
    // Compile ts to js
    await promisify(exec)("node_modules/.bin/tsc", { cwd: dir });
  } catch (err) {
    throw new Error(`Typescript compilation failed: ${err.stdout}`);
  }
  return { importFromProject, readFromProject, existsInProject };
}

/**
 * Reads all generated files from a directory and concatenates their contents
 * into a single string for snapshot testing.
 */
export function collectSnapshotForDir(dir: string): string {
  const files = fs.readdirSync(dir).sort();
  let allFileContents = "";
  // Append the contents of each file to a string.
  // Skip compiled .js files — they are derived artifacts whose content varies
  // with the TypeScript target, making snapshots brittle across tsc upgrades.
  for (const file of files) {
    if (file.endsWith(".js")) {
      continue;
    }
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isFile()) {
      const fileContents = fs.readFileSync(filePath, "utf8");
      allFileContents += `\n--- ${file} ---\n${fileContents}`;
    }
  }
  return allFileContents;
}
