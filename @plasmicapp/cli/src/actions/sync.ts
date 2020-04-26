import path from "path";
import L from "lodash";
import fs, { writeFile } from "fs";
import { CommonArgs } from "..";
import { getContext, updateConfig, PlasmicConfig, ProjectConfig as CliProjectConfig } from "../utils/config-utils";
import {
  buildBaseNameToFiles,
  writeFileContent,
  fixComponentPaths,
  fixGlobalVariantFilePath,
  fixProjectFilePaths
} from "../utils/file-utils";
import {
  ProjectBundle,
  ComponentBundle,
  GlobalVariantBundle,
  ProjectConfig as ApiProjectConfig
} from "../api";
import { fixAllImportStatements } from "../utils/code-utils";
import { upsertStyleTokens } from "./sync-styles";
import { flatMap } from "../utils/lang-utils";
import { warnLatestReactWeb } from "../utils/npm-utils";

export interface SyncArgs extends CommonArgs {
  projects: readonly string[];
  components: readonly string[];
  includeNew: boolean;
}

export async function syncProjects(opts: SyncArgs) {
  const context = getContext(opts);
  const api = context.api;
  const config = context.config;
  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : config.projects.map(p => p.projectId);
  if (projectIds.length === 0) {
    console.error(
      "Don't know which projects to sync; please specify via --projects"
    );
    process.exit(1);
  }

  // `components` is a list of component names or IDs
  const components =
    opts.components.length > 0
      ? opts.components
      : flatMap(config.projects, p => p.components.map(c => c.id));
  const shouldSyncComponents = (id: string, name: string) => {
    if (
      components.length === 0 ||
      (opts.components.length === 0 && opts.includeNew)
    ) {
      return true;
    }
    return components.includes(id) || components.includes(name);
  };

  const baseNameToFiles = buildBaseNameToFiles(context);

  const results = await Promise.all(
    projectIds.map(projectId => api.projectComponents(projectId))
  );
  for (const [projectId, projectBundle] of L.zip(projectIds, results) as [
    string,
    ProjectBundle
  ][]) {

    syncGlobalVariants(
      config,
      projectId,
      projectBundle.globalVariants,
      baseNameToFiles
    );
    const componentBundles = projectBundle.components.filter(bundle =>
      shouldSyncComponents(bundle.id, bundle.componentName)
    );
    syncProjectConfig(config, projectBundle.projectConfig, componentBundles, baseNameToFiles);
    upsertStyleTokens(config, projectBundle.usedTokens, baseNameToFiles);
  }

  // Write the new ComponentConfigs to disk
  updateConfig(context, {
    projects: config.projects,
    globalVariants: config.globalVariants,
    tokens: config.tokens,
  });

  // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
  fixAllImportStatements(context);

  await warnLatestReactWeb(context);
}

function syncProjectComponents(
  config: PlasmicConfig,
  project: CliProjectConfig,
  componentBundles: ComponentBundle[],
  baseNameToFiles: Record<string, string[]>
) {
  const allCompConfigs = L.keyBy(project.components, c => c.id);
  const srcDir = config.srcDir;
  for (const bundle of componentBundles) {
    const {
      renderModule,
      skeletonModule,
      cssRules,
      renderModuleFileName,
      skeletonModuleFileName,
      cssFileName,
      componentName,
      id
    } = bundle;
    console.log(`Syncing component ${componentName} [${project.projectId}/${id}]`);
    let compConfig = allCompConfigs[id];
    const isNew = !compConfig;
    if (isNew) {
      // This is the first time we're syncing this component
      compConfig = {
        id,
        name: componentName,
        type: "managed",
        projectId: project.projectId,
        renderModuleFilePath: renderModuleFileName,
        importSpec: { modulePath: skeletonModuleFileName },
        cssFilePath: cssFileName
      };
      allCompConfigs[id] = compConfig;
      project.components.push(allCompConfigs[id]);

      // Because it's the first time, we also generate the skeleton file.
      writeFileContent(config, skeletonModuleFileName, skeletonModule, {
        force: false
      });
    } else {
      // This is an existing component. We first make sure the files are all in the expected
      // places, and then overwrite them with the new content
      fixComponentPaths(srcDir, compConfig, baseNameToFiles);
    }
    writeFileContent(config, compConfig.renderModuleFilePath, renderModule, {
      force: !isNew
    });
    writeFileContent(config, compConfig.cssFilePath, cssRules, {
      force: !isNew
    });
  }
}

function syncGlobalVariants(
  config: PlasmicConfig,
  projectId: string,
  bundles: GlobalVariantBundle[],
  baseNameToFiles: Record<string, string[]>
) {
  const allVariantConfigs = L.keyBy(
    config.globalVariants.variantGroups,
    c => c.id
  );
  for (const bundle of bundles) {
    console.log(
      `Syncing global variant ${bundle.name} [${projectId}/${bundle.id}]`
    );
    let variantConfig = allVariantConfigs[bundle.id];
    const isNew = !variantConfig;
    if (isNew) {
      variantConfig = {
        id: bundle.id,
        name: bundle.name,
        projectId,
        contextFilePath: bundle.contextFileName
      };
      allVariantConfigs[bundle.id] = variantConfig;
      config.globalVariants.variantGroups.push(variantConfig);
    } else {
      fixGlobalVariantFilePath(config.srcDir, variantConfig, baseNameToFiles);
    }

    writeFileContent(
      config,
      variantConfig.contextFilePath,
      bundle.contextModule,
      { force: !isNew }
    );
  }
}

function syncProjectConfig(
  config: PlasmicConfig,
  pc: ApiProjectConfig,
  componentBundles: ComponentBundle[],
  baseNameToFiles: Record<string, string[]>
) {
  const cliProject = config.projects.find(c => c.projectId === pc.projectId);
  if (!cliProject) {
    writeFileContent(config, pc.fontsFileName, pc.fontsModule, {
      force: false
    });
    const c = {
      projectId: pc.projectId,
      fontsFilePath: pc.fontsFileName,
      components: []
    };
    config.projects.push(c);
    syncProjectComponents(config, c, componentBundles, baseNameToFiles);
  } else {
    fixProjectFilePaths(config.srcDir, cliProject, baseNameToFiles);
    writeFileContent(config, cliProject.fontsFilePath, pc.fontsModule, {
      force: true
    });
    syncProjectComponents(config, cliProject, componentBundles, baseNameToFiles);
  }


}
