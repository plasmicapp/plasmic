import path from "path";
import L, { merge } from "lodash";
import fs, { writeFile } from "fs";
import { CommonArgs } from "..";
import {
  getContext,
  updateConfig,
  PlasmicConfig,
  ProjectConfig as CliProjectConfig,
  PlasmicContext
} from "../utils/config-utils";
import {
  buildBaseNameToFiles,
  writeFileContent,
  fixComponentPaths,
  fixGlobalVariantFilePath,
  fixProjectFilePaths,
  findSrcDirPath,
  readFileContent,
  fixIconFilePath
} from "../utils/file-utils";
import {
  ProjectBundle,
  ComponentBundle,
  GlobalVariantBundle,
  ProjectConfig as ApiProjectConfig,
  StyleConfigResponse,
  IconBundle
} from "../api";
import { fixAllImportStatements } from "../utils/code-utils";
import { upsertStyleTokens } from "./sync-styles";
import { flatMap } from "../utils/lang-utils";
import {
  warnLatestReactWeb,
  getCliVersion,
  findInstalledVersion
} from "../utils/npm-utils";
import {
  ComponentInfoForMerge,
  mergeFiles,
  makeCachedProjectSyncDataProvider
} from "@plasmicapp/code-merger";
import { options } from "yargs";

export interface SyncArgs extends CommonArgs {
  projects: readonly string[];
  components: readonly string[];
  onlyExisting: boolean;
  forceOverwrite: boolean;
  newComponentScheme?: "blackbox" | "direct";
}

function maybeMigrate(context: PlasmicContext) {
  let existingFiles: L.Dictionary<string[]> | null = null;
  context.config.projects.forEach(project => {
    project.components.forEach(c => {
      if (c.renderModuleFilePath.endsWith("ts")) {
        if (!existingFiles) {
          existingFiles = buildBaseNameToFiles(context);
        }
        const relFilePath = findSrcDirPath(
          context.absoluteSrcDir,
          c.renderModuleFilePath,
          existingFiles
        );
        const absFilePath = path.join(context.absoluteSrcDir, relFilePath);
        if (fs.existsSync(absFilePath)) {
          console.log(`rename file from ${absFilePath} to ${absFilePath}x`);
          fs.renameSync(absFilePath, `${absFilePath}x`);
        }
        c.renderModuleFilePath = `${c.renderModuleFilePath}x`;
      }
    });
  });
}

export async function syncProjects(opts: SyncArgs) {
  const context = getContext(opts);
  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : context.config.projects.map(p => p.projectId);
  if (projectIds.length === 0) {
    console.error(
      "Don't know which projects to sync; please specify via --projects"
    );
    process.exit(1);
  }

  const reactWebVersion = findInstalledVersion(
    context,
    "@plasmicapp/react-web"
  );

  const results = await Promise.all(
    projectIds.map(projectId => {
      const existingProject = context.config.projects.find(
        p => p.projectId === projectId
      );
      const existingCompConfig: Array<[string, "blackbox" | "direct"]> = (
        existingProject?.components || []
      ).map(c => [c.id, c.scheme]);
      return context.api.projectComponents(
        projectId,
        getCliVersion(),
        reactWebVersion,
        opts.newComponentScheme || context.config.code.scheme,
        existingCompConfig
      );
    })
  );
  if (
    results.find(project =>
      project.components.find(c => c.renderModuleFileName.endsWith(".tsx"))
    )
  ) {
    maybeMigrate(context);
  }
  // Materialize scheme into each component config.
  context.config.projects.forEach(p =>
    p.components.forEach(c => {
      if (!c.scheme) {
        c.scheme = context.config.code.scheme;
      }
    })
  );

  const baseNameToFiles = buildBaseNameToFiles(context);

  syncStyleConfig(context, await context.api.genStyleConfig(), baseNameToFiles);

  const config = context.config;
  // `components` is a list of component names or IDs
  const components =
    opts.components.length > 0
      ? opts.components
      : flatMap(config.projects, p => p.components.map(c => c.id));
  const shouldSyncComponents = (id: string, name: string) => {
    if (
      components.length === 0 ||
      (opts.components.length === 0 && !opts.onlyExisting)
    ) {
      return true;
    }
    return components.includes(id) || components.includes(name);
  };

  for (const [projectId, projectBundle] of L.zip(projectIds, results) as [
    string,
    ProjectBundle
  ][]) {
    syncGlobalVariants(
      context,
      projectId,
      projectBundle.globalVariants,
      baseNameToFiles
    );
    const componentBundles = projectBundle.components.filter(bundle =>
      shouldSyncComponents(bundle.id, bundle.componentName)
    );
    await syncProjectConfig(
      context,
      projectBundle.projectConfig,
      componentBundles,
      projectBundle.iconAssets,
      baseNameToFiles,
      opts.forceOverwrite
    );
    upsertStyleTokens(context, projectBundle.usedTokens, baseNameToFiles);
  }

  // Write the new ComponentConfigs to disk
  updateConfig(context, {
    projects: config.projects,
    globalVariants: config.globalVariants,
    tokens: config.tokens,
    style: config.style
  });

  // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
  fixAllImportStatements(context);

  await warnLatestReactWeb(context);
}

async function syncProjectComponents(
  context: PlasmicContext,
  project: CliProjectConfig,
  componentBundles: ComponentBundle[],
  baseNameToFiles: Record<string, string[]>,
  forceOverwrite: boolean
) {
  const allCompConfigs = L.keyBy(project.components, c => c.id);
  for (const bundle of componentBundles) {
    const {
      renderModule,
      skeletonModule,
      cssRules,
      renderModuleFileName,
      skeletonModuleFileName,
      cssFileName,
      componentName,
      id,
      scheme,
      nameInIdToUuid
    } = bundle;
    console.log(
      `Syncing component ${componentName} [${project.projectId}/${id}]`
    );
    let compConfig = allCompConfigs[id];
    const isNew = !compConfig;
    if (isNew) {
      // This is the first time we're syncing this component
      compConfig = {
        id,
        name: componentName,
        type: "managed",
        projectId: project.projectId,
        renderModuleFilePath: path.join(
          context.config.defaultPlasmicDir,
          L.snakeCase(`${project.projectName}`),
          renderModuleFileName
        ),
        importSpec: { modulePath: skeletonModuleFileName },
        cssFilePath: path.join(
          context.config.defaultPlasmicDir,
          L.snakeCase(project.projectName),
          cssFileName
        ),
        scheme: scheme as "blackbox" | "direct"
      };
      allCompConfigs[id] = compConfig;
      project.components.push(allCompConfigs[id]);

      // Because it's the first time, we also generate the skeleton file.
      writeFileContent(context, skeletonModuleFileName, skeletonModule, {
        force: false
      });
    } else {
      // This is an existing component. We first make sure the files are all in the expected
      // places, and then overwrite them with the new content
      fixComponentPaths(context.absoluteSrcDir, compConfig, baseNameToFiles);
      const editedFile = readFileContent(
        context,
        compConfig.importSpec.modulePath
      );
      if (scheme === "direct") {
        // merge code!
        const componentByUuid = new Map<string, ComponentInfoForMerge>();

        componentByUuid.set(compConfig.id, {
          editedFile,
          newFile: skeletonModule,
          newNameInIdToUuid: new Map(nameInIdToUuid)
        });
        const mergedFiles = await mergeFiles(
          componentByUuid,
          project.projectId,
          makeCachedProjectSyncDataProvider((projectId, revision) =>
            context.api.projectSyncMetadata(projectId, revision)
          )
        );
        const merged = mergedFiles?.get(compConfig.id);
        if (merged) {
          writeFileContent(context, compConfig.importSpec.modulePath, merged, {
            force: true
          });
        } else {
          if (!forceOverwrite) {
            console.error(
              `Cannot merge ${compConfig.importSpec.modulePath}. If you just switched the code scheme for the component from blackbox to direct, use --force-overwrite option to force the switch.`
            );
            process.exit(1);
          } else {
            console.log(
              `Overwrite ${compConfig.importSpec.modulePath} despite merge failure`
            );
            writeFileContent(
              context,
              compConfig.importSpec.modulePath,
              skeletonModule,
              {
                force: true
              }
            );
          }
        }
      } else if (/\/\/\s*plasmic-managed-jsx\/\d+/.test(editedFile)) {
        if (forceOverwrite) {
          writeFileContent(
            context,
            compConfig.importSpec.modulePath,
            skeletonModule,
            {
              force: true
            }
          );
        } else {
          console.warn(
            `file ${compConfig.importSpec.modulePath} is likely in "direct" scheme. If you intend to switch the code scheme from direct to blackbox, use --force-overwrite option to force the switch.`
          );
        }
      }
    }
    writeFileContent(context, compConfig.renderModuleFilePath, renderModule, {
      force: !isNew
    });
    writeFileContent(context, compConfig.cssFilePath, cssRules, {
      force: !isNew
    });
  }
}

function syncStyleConfig(
  context: PlasmicContext,
  response: StyleConfigResponse,
  baseNameToFiles: Record<string, string[]>
) {
  const expectedPath =
    context.config.style.defaultStyleCssFilePath ||
    path.join(
      context.config.defaultPlasmicDir,
      response.defaultStyleCssFileName
    );

  context.config.style.defaultStyleCssFilePath = findSrcDirPath(
    context.absoluteSrcDir,
    expectedPath,
    baseNameToFiles
  );

  writeFileContent(
    context,
    context.config.style.defaultStyleCssFilePath,
    response.defaultStyleCssRules,
    { force: true }
  );
}

function syncGlobalVariants(
  context: PlasmicContext,
  projectId: string,
  bundles: GlobalVariantBundle[],
  baseNameToFiles: Record<string, string[]>
) {
  const allVariantConfigs = L.keyBy(
    context.config.globalVariants.variantGroups,
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
        contextFilePath: path.join(
          context.config.defaultPlasmicDir,
          bundle.contextFileName
        )
      };
      allVariantConfigs[bundle.id] = variantConfig;
      context.config.globalVariants.variantGroups.push(variantConfig);
    } else {
      fixGlobalVariantFilePath(
        context.absoluteSrcDir,
        variantConfig,
        baseNameToFiles
      );
    }

    writeFileContent(
      context,
      variantConfig.contextFilePath,
      bundle.contextModule,
      { force: !isNew }
    );
  }
}

function syncProjectIconAssets(
  context: PlasmicContext,
  project: CliProjectConfig,
  iconBundles: IconBundle[],
  baseNameToFiles: Record<string, string[]>
) {
  const knownIconConfigs = L.keyBy(project.icons, i => i.id);
  console.log("ICON BUNDLES", iconBundles);
  for (const bundle of iconBundles) {
    console.log(
      `Syncing icon ${bundle.name} [${project.projectId}/${bundle.id}]`
    );
    let iconConfig = knownIconConfigs[bundle.id];
    const isNew = !iconConfig;
    if (isNew) {
      iconConfig = {
        id: bundle.id,
        name: bundle.name,
        moduleFilePath: path.join(
          context.config.defaultPlasmicDir,
          L.snakeCase(`${project.projectName}`),
          bundle.fileName
        )
      };
      knownIconConfigs[bundle.id] = iconConfig;
      project.icons.push(iconConfig);
    } else {
      fixIconFilePath(context.absoluteSrcDir, iconConfig, baseNameToFiles);
    }

    writeFileContent(context, iconConfig.moduleFilePath, bundle.module, {
      force: !isNew
    });
  }
}

async function syncProjectConfig(
  context: PlasmicContext,
  pc: ApiProjectConfig,
  componentBundles: ComponentBundle[],
  iconBundles: IconBundle[],
  baseNameToFiles: Record<string, string[]>,
  forceOverwrite: boolean
) {
  let cliProject = context.config.projects.find(
    c => c.projectId === pc.projectId
  );
  const defaultCssFilePath = path.join(
    context.config.defaultPlasmicDir,
    L.snakeCase(pc.projectName),
    pc.cssFileName
  );
  const isNew = !cliProject;
  if (!cliProject) {
    cliProject = {
      projectId: pc.projectId,
      projectName: pc.projectName,
      cssFilePath: defaultCssFilePath,
      components: [],
      icons: []
    };
    context.config.projects.push(cliProject);
  }

  if (!cliProject.cssFilePath) {
    // this is a config from before cssFilePath existed
    cliProject.cssFilePath = defaultCssFilePath;
  } else if (!isNew) {
    fixProjectFilePaths(context.absoluteSrcDir, cliProject, baseNameToFiles);
  }

  writeFileContent(context, cliProject.cssFilePath, pc.cssRules, {
    force: !isNew
  });
  await syncProjectComponents(
    context,
    cliProject,
    componentBundles,
    baseNameToFiles,
    forceOverwrite
  );
  syncProjectIconAssets(context, cliProject, iconBundles, baseNameToFiles);
}
