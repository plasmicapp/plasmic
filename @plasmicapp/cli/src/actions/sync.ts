import path from "upath";
import L, { merge } from "lodash";
import inquirer from "inquirer";
import { CommonArgs } from "..";
import { logger } from "../deps";
import {
  getContext,
  updateConfig,
  PlasmicContext,
  ProjectConfig,
  createProjectConfig,
  CONFIG_FILE_NAME
} from "../utils/config-utils";
import {
  buildBaseNameToFiles,
  writeFileContent,
  findSrcDirPath,
  readFileContent,
  stripExtension,
  fixAllFilePaths
} from "../utils/file-utils";
import {
  ProjectBundle,
  ComponentBundle,
  GlobalVariantBundle,
  ProjectMetaBundle,
  StyleConfigResponse,
  IconBundle,
  AppServerError
} from "../api";
import {
  fixAllImportStatements,
  tsxToJsx,
  formatScript,
  ComponentUpdateSummary,
  formatAsLocal
} from "../utils/code-utils";
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
import { syncProjectIconAssets } from "./sync-icons";
import * as semver from "../utils/semver";

export interface SyncArgs extends CommonArgs {
  projects: readonly string[];
  components: readonly string[];
  onlyExisting: boolean;
  forceOverwrite: boolean;
  newComponentScheme?: "blackbox" | "direct";
  appendJsxOnMissingBase?: boolean;
  recursive?: boolean;
  includeDependencies?: boolean;
  nonInteractive?: boolean;
}

function maybeConvertTsxToJsx(fileName: string, content: string) {
  if (fileName.endsWith("tsx")) {
    const jsFileName = stripExtension(fileName) + ".jsx";
    const jsContent = formatScript(tsxToJsx(content));
    return [jsFileName, jsContent];
  }
  return [fileName, content];
}

/**
 * Sync will always try to sync down a set of components that are version-consistent among specified projects.
 * (we only allow 1 version per projectId).
 * NOTE: the repo/plasmic.json might include projects with conflicting versions in its dependency tree.
 * We leave it to the user to sync all projects if they want us to catch/prevent this.
 * @param opts
 */
export async function sync(opts: SyncArgs): Promise<void> {
  const context = getContext(opts);
  fixAllFilePaths(context);
  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : context.config.projects.map(p => p.projectId);

  // Short-circuit if nothing to sync
  if (projectIds.length === 0) {
    throw new Error(
      "Don't know which projects to sync; please specify via --projects"
    );
  }

  // Resolve what will be synced
  const projectConfigMap = L.keyBy(context.config.projects, p => p.projectId);
  const projectSyncParams = projectIds.map(projectId => {
    return {
      projectId,
      versionRange: projectConfigMap[projectId]?.version ?? "latest",
      componentIdOrNames:
        opts.components.length === 0 ? undefined : opts.components
    };
  });
  const { projects: resolveResults, conflicts } = await context.api.resolveSync(
    projectSyncParams,
    opts.recursive,
    opts.includeDependencies
  );

  // Throw if there's nothing to sync
  if (resolveResults.length <= 0) {
    throw new Error(
      `Could not find any matching versions. Please check your plasmic.json file.`
    );
  }

  // First check if the sync is consistent with itself (independent of plasmic.json),
  // since we can specify multiple root projects to sync
  if (conflicts && conflicts.length > 0) {
    // TODO: replace with better error message
    throw new Error(
      `Sync resolution failed: \n${resolveResults}\nConflicts:\n${conflicts}`
    );
  }

  // Check for projects that don't satisfy our PlasmicConfig version ranges
  // Note: This should ONLY be for project dependencies, since resolveSync will only get user-specified projects/components within range.
  const breakingProjects = resolveResults.filter(
    r =>
      !!projectConfigMap[r.projectId] &&
      !semver.satisfies(r.version, projectConfigMap[r.projectId].version)
  );
  // Check if we want to continue, giving up early in non-interactive mode
  const breakingMessage = breakingProjects.map(
    p =>
      `${p.projectId}@${projectConfigMap[p.projectId].version}=>v${p.version}`
  );
  if (breakingProjects.length > 0 && opts.nonInteractive) {
    throw new Error(
      `Unable to sync these projects due to conflicting versions: ${breakingMessage}`
    );
  } else if (breakingProjects.length > 0) {
    logger.warn(
      `Doing this sync will generate components outside of these project's version ranges:\n${breakingMessage}`
    );
    const res = await inquirer.prompt([
      {
        name: "continue",
        message: `Do you want to continue? (Y/n)`,
        default: "y"
      }
    ]);
    if (!["y", "yes"].includes(res.continue.toLowerCase())) {
      throw new Error("User aborted");
    }
  }
  // Update plasmic.json with newest version numbers
  resolveResults.forEach(p => {
    // Defaulting to caret ranges
    const newVersionRange = semver.toCaretRange(p.version);
    if (projectConfigMap[p.projectId] && newVersionRange) {
      projectConfigMap[p.projectId].version = newVersionRange;
    }
  });

  // Sync each project
  // Note: order should not matter during code-gen, because we fix imports all together at the end
  const reactWebVersion = findInstalledVersion(
    context,
    "@plasmicapp/react-web"
  );
  const summary = new Map<string, ComponentUpdateSummary>();
  await Promise.all(
    resolveResults.map(async projectMeta => {
      // By default projects that users explicitly sync use "latest" and dependencies use caret ranges.
      const caretVersionRange = semver.toCaretRange(projectMeta.version);
      const versionRange =
        projectConfigMap[projectMeta.projectId]?.version ??
        (projectIds.includes(projectMeta.projectId) || !caretVersionRange)
          ? "latest"
          : caretVersionRange;
      await syncProject(
        context,
        opts,
        projectMeta.projectId,
        projectMeta.componentIds,
        projectMeta.version,
        versionRange,
        reactWebVersion,
        summary
      );
    })
  );

  // Materialize scheme into each component config.
  context.config.projects.forEach(p =>
    p.components.forEach(c => {
      if (!c.scheme) {
        c.scheme = context.config.code.scheme;
      }
    })
  );

  syncStyleConfig(context, await context.api.genStyleConfig());

  // Write the new ComponentConfigs to disk
  updateConfig(context, {
    projects: context.config.projects,
    globalVariants: context.config.globalVariants,
    tokens: context.config.tokens,
    style: context.config.style
  });

  // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
  fixAllImportStatements(context, summary);

  if (!opts.nonInteractive) {
    await warnLatestReactWeb(context);
  }
}

async function syncProject(
  context: PlasmicContext,
  opts: SyncArgs,
  projectId: string,
  componentIds: string[],
  projectVersion: string,
  projectVersionRange: string,
  reactWebVersion: string | undefined,
  summary: Map<string, ComponentUpdateSummary>
): Promise<void> {
  const newComponentScheme =
    opts.newComponentScheme || context.config.code.scheme;
  const existingProject = context.config.projects.find(
    p => p.projectId === projectId
  );
  const existingCompScheme: Array<[string, "blackbox" | "direct"]> = (
    existingProject?.components || []
  ).map(c => [c.id, c.scheme]);

  // Server-side code-gen
  const projectBundle = await context.api.projectComponents(
    projectId,
    getCliVersion(),
    reactWebVersion,
    newComponentScheme,
    existingCompScheme,
    componentIds,
    projectVersion
  );

  // Convert from TSX => JSX
  if (context.config.code.lang === "js") {
    projectBundle.components.forEach(c => {
      [c.renderModuleFileName, c.renderModule] = maybeConvertTsxToJsx(
        c.renderModuleFileName,
        c.renderModule
      );
      [c.skeletonModuleFileName, c.skeletonModule] = maybeConvertTsxToJsx(
        c.skeletonModuleFileName,
        c.skeletonModule
      );
    });
    projectBundle.iconAssets.forEach(icon => {
      [icon.fileName, icon.module] = maybeConvertTsxToJsx(
        icon.fileName,
        icon.module
      );
    });
    projectBundle.globalVariants.forEach(gv => {
      [gv.contextFileName, gv.contextModule] = maybeConvertTsxToJsx(
        gv.contextFileName,
        gv.contextModule
      );
    });
  }

  const knownComponentIds = new Set(
    flatMap(context.config.projects, p => p.components.map(c => c.id))
  );
  const shouldSyncComponents = (id: string, name: string) => {
    if (opts.onlyExisting) {
      // If explicitly told to only sync known components, then check
      return knownComponentIds.has(id);
    }

    // Otherwise, we sync all components; if the user had specified --components, we
    // have already passed that up to the server, and the server should've only sent
    // down a filtered set of components already.
    return true;
  };

  syncGlobalVariants(context, projectId, projectBundle.globalVariants);
  const componentBundles = projectBundle.components.filter(bundle =>
    shouldSyncComponents(bundle.id, bundle.componentName)
  );
  await syncProjectConfig(
    context,
    projectBundle.projectConfig,
    projectVersion,
    projectVersionRange,
    componentBundles,
    projectBundle.iconAssets,
    opts.forceOverwrite,
    !!opts.appendJsxOnMissingBase,
    summary
  );
  upsertStyleTokens(context, projectBundle.usedTokens);
}

async function syncProjectComponents(
  context: PlasmicContext,
  project: ProjectConfig,
  version: string,
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean,
  summary: Map<string, ComponentUpdateSummary>
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
    logger.info(
      `Syncing component ${componentName} ${version} [${project.projectId}/${id} ${project.version}]`
    );
    let compConfig = allCompConfigs[id];
    const isNew = !compConfig;
    let skeletonModuleModified = isNew;
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
      // This is an existing component.

      // Update config on new name from server
      if (componentName !== compConfig.name) {
        compConfig.name = componentName;
      }

      // Read in the existing file
      let editedFile: string;
      try {
        editedFile = readFileContent(context, compConfig.importSpec.modulePath);
      } catch (e) {
        logger.warn(
          `${compConfig.importSpec.modulePath} is missing. If you deleted this component, remember to remove the component from ${CONFIG_FILE_NAME}`
        );
        throw e;
      }
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
          makeCachedProjectSyncDataProvider(async (projectId, revision) => {
            try {
              return await context.api.projectSyncMetadata(
                projectId,
                revision,
                true
              );
            } catch (e) {
              if (
                e instanceof AppServerError &&
                /revision \d+ not found/.test(e.message)
              ) {
                throw e;
              } else {
                logger.log(e.messag);
                process.exit(1);
              }
            }
          }),
          () => {},
          appendJsxOnMissingBase
        );
        const merged = mergedFiles?.get(compConfig.id);
        if (merged) {
          writeFileContent(context, compConfig.importSpec.modulePath, merged, {
            force: true
          });
        } else {
          if (!forceOverwrite) {
            throw new Error(
              `Cannot merge ${compConfig.importSpec.modulePath}. If you just switched the code scheme for the component from blackbox to direct, use --force-overwrite option to force the switch.`
            );
          } else {
            logger.warn(
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
        skeletonModuleModified = true;
      } else if (/\/\/\s*plasmic-managed-jsx\/\d+/.test(editedFile)) {
        if (forceOverwrite) {
          skeletonModuleModified = true;
          writeFileContent(
            context,
            compConfig.importSpec.modulePath,
            skeletonModule,
            {
              force: true
            }
          );
        } else {
          logger.warn(
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
    summary.set(id, { skeletonModuleModified });
  }
}

function syncStyleConfig(
  context: PlasmicContext,
  response: StyleConfigResponse
) {
  const expectedPath =
    context.config.style.defaultStyleCssFilePath ||
    path.join(
      context.config.defaultPlasmicDir,
      response.defaultStyleCssFileName
    );
  context.config.style.defaultStyleCssFilePath = expectedPath;
  writeFileContent(context, expectedPath, response.defaultStyleCssRules, {
    force: true
  });
}

function syncGlobalVariants(
  context: PlasmicContext,
  projectId: string,
  bundles: GlobalVariantBundle[]
) {
  const allVariantConfigs = L.keyBy(
    context.config.globalVariants.variantGroups,
    c => c.id
  );
  for (const bundle of bundles) {
    logger.info(
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
    }

    writeFileContent(
      context,
      variantConfig.contextFilePath,
      bundle.contextModule,
      { force: !isNew }
    );
  }
}

async function syncProjectConfig(
  context: PlasmicContext,
  pc: ProjectMetaBundle,
  version: string,
  versionRange: string,
  componentBundles: ComponentBundle[],
  iconBundles: IconBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean,
  summary: Map<string, ComponentUpdateSummary>
) {
  let project = context.config.projects.find(c => c.projectId === pc.projectId);
  const defaultCssFilePath = path.join(
    context.config.defaultPlasmicDir,
    L.snakeCase(pc.projectName),
    pc.cssFileName
  );
  const isNew = !project;
  if (!project) {
    project = createProjectConfig({
      projectId: pc.projectId,
      projectName: pc.projectName,
      version: versionRange,
      cssFilePath: defaultCssFilePath
    });
    context.config.projects.push(project);
  } else {
    project.projectName = pc.projectName;
  }

  if (!project.cssFilePath) {
    project.cssFilePath = defaultCssFilePath;
  }
  writeFileContent(context, project.cssFilePath, pc.cssRules, {
    force: !isNew
  });
  await syncProjectComponents(
    context,
    project,
    version,
    componentBundles,
    forceOverwrite,
    appendJsxOnMissingBase,
    summary
  );
  syncProjectIconAssets(context, project, iconBundles);
}
