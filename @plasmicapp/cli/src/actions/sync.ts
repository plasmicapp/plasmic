import path from "upath";
import L from "lodash";
import { CommonArgs } from "..";
import { logger } from "../deps";
import {
  getContext,
  getOrAddProjectConfig,
  getOrAddProjectLock,
  updateConfig,
  PlasmicContext,
  ProjectConfig,
  ProjectLock,
  createProjectConfig,
  CONFIG_FILE_NAME,
  ComponentConfig,
} from "../utils/config-utils";
import {
  buildBaseNameToFiles,
  writeFileContent,
  findSrcDirPath,
  readFileContent,
  stripExtension,
  fixAllFilePaths,
  withBufferedFs,
} from "../utils/file-utils";
import {
  ProjectBundle,
  ComponentBundle,
  GlobalVariantBundle,
  ProjectMetaBundle,
  StyleConfigResponse,
  IconBundle,
  AppServerError,
} from "../api";
import {
  fixAllImportStatements,
  tsxToJsx,
  formatScript,
  ComponentUpdateSummary,
  replaceImports,
  mkFixImportContext,
  formatAsLocal,
  maybeConvertTsxToJsx,
} from "../utils/code-utils";
import { upsertStyleTokens } from "./sync-styles";
import { flatMap } from "../utils/lang-utils";
import {
  warnLatestReactWeb,
  getCliVersion,
  findInstalledVersion,
} from "../utils/npm-utils";
import {
  ComponentInfoForMerge,
  mergeFiles,
  makeCachedProjectSyncDataProvider,
} from "@plasmicapp/code-merger";
import { syncProjectIconAssets } from "./sync-icons";
import * as semver from "../utils/semver";
import { spawnSync } from "child_process";
import { HandledError } from "../utils/error";
import { checkVersionResolution } from "../utils/resolve-utils";

export interface SyncArgs extends CommonArgs {
  projects: readonly string[];
  forceOverwrite: boolean;
  newComponentScheme?: "blackbox" | "direct";
  appendJsxOnMissingBase?: boolean;
  yes?: boolean;
  force?: boolean;
  nonRecursive?: boolean;
  skipReactWeb?: boolean;
}

interface ComponentPendingMerge {
  // path of the skeleton module
  skeletonModulePath: string;
  editedSkeletonFile: string;
  newSkeletonFile: string;
  // function to perform code merger using input whose import has been resolved.
  merge: (
    resolvedNewSkeletonFile: string,
    resolvedEditedSkeletonFile: string
  ) => Promise<void>;
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
      : context.config.projects.map((p) => p.projectId);

  // Short-circuit if nothing to sync
  if (projectIds.length === 0) {
    throw new HandledError(
      "Don't know which projects to sync. Please specify via --projects"
    );
  }

  // Resolve what will be synced
  const projectConfigMap = L.keyBy(context.config.projects, (p) => p.projectId);
  const projectSyncParams = projectIds.map((projectId) => {
    // Use the version in plasmic.json, otherwise default to "latest"
    const versionRange = projectConfigMap[projectId]?.version ?? "latest";
    return {
      projectId,
      versionRange,
      componentIdOrNames: undefined, // Get all components!
    };
  });
  const versionResolution = await context.api.resolveSync(
    projectSyncParams,
    true // we always want to get dependency data
  );

  // Make sure the resolution is compatible with plasmic.json and plasmic.lock
  const projectsToSync = await checkVersionResolution(
    versionResolution,
    context,
    opts
  );
  if (projectsToSync.length <= 0) {
    throw new HandledError(
      "No compatible versions to sync. Please fix the warnings and try again."
    );
  }

  const reactWebVersion = findInstalledVersion(
    context,
    "@plasmicapp/react-web"
  );
  const summary = new Map<string, ComponentUpdateSummary>();
  const pendingMerge = new Array<ComponentPendingMerge>();

  // Perform the actual sync
  await withBufferedFs(async () => {
    // Sync in sequence (no parallelism)
    // going in reverse to get leaves of the dependency tree first
    for (const projectMeta of projectsToSync) {
      await syncProject(
        context,
        opts,
        projectMeta.projectId,
        projectMeta.componentIds,
        projectMeta.iconIds,
        projectMeta.version,
        projectMeta.dependencies,
        reactWebVersion,
        summary,
        pendingMerge
      );
    }

    // Materialize scheme into each component config.
    context.config.projects.forEach((p) =>
      p.components.forEach((c) => {
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
      style: context.config.style,
    });

    // Fix imports
    const fixImportContext = mkFixImportContext(context.config);
    for (const m of pendingMerge) {
      const resolvedEditedFile = replaceImports(
        m.editedSkeletonFile,
        m.skeletonModulePath,
        fixImportContext,
        true
      );
      const resolvedNewFile = replaceImports(
        m.newSkeletonFile,
        m.skeletonModulePath,
        fixImportContext,
        true
      );
      await m.merge(resolvedNewFile, resolvedEditedFile);
    }
    // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
    fixAllImportStatements(context, summary);
  });

  // Prompt to upgrade react-web
  if (!opts.skipReactWeb) {
    await warnLatestReactWeb(context, opts.yes);
  }

  // Post-sync commands
  for (const cmd of context.config.postSyncCommands || []) {
    spawnSync(cmd, { shell: true, stdio: "inherit" });
  }
}

async function syncProject(
  context: PlasmicContext,
  opts: SyncArgs,
  projectId: string,
  componentIds: string[],
  iconIds: string[],
  projectVersion: string,
  dependencies: { [projectId: string]: string },
  reactWebVersion: string | undefined,
  summary: Map<string, ComponentUpdateSummary>,
  pendingMerge: ComponentPendingMerge[]
): Promise<void> {
  const newComponentScheme =
    opts.newComponentScheme || context.config.code.scheme;
  const existingProject = context.config.projects.find(
    (p) => p.projectId === projectId
  );
  const existingCompScheme: Array<[string, "blackbox" | "direct"]> = (
    existingProject?.components || []
  ).map((c) => [c.id, c.scheme]);

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
    projectBundle.components.forEach((c) => {
      [c.renderModuleFileName, c.renderModule] = maybeConvertTsxToJsx(
        c.renderModuleFileName,
        c.renderModule
      );
      [c.skeletonModuleFileName, c.skeletonModule] = maybeConvertTsxToJsx(
        c.skeletonModuleFileName,
        c.skeletonModule
      );
    });
    projectBundle.iconAssets.forEach((icon) => {
      [icon.fileName, icon.module] = maybeConvertTsxToJsx(
        icon.fileName,
        icon.module
      );
    });
    projectBundle.globalVariants.forEach((gv) => {
      [gv.contextFileName, gv.contextModule] = maybeConvertTsxToJsx(
        gv.contextFileName,
        gv.contextModule
      );
    });
    projectBundle.projectConfig.jsBundleThemes.forEach((theme) => {
      [theme.themeFileName, theme.themeModule] = maybeConvertTsxToJsx(
        theme.themeFileName,
        theme.themeModule
      );
    });
  }

  syncGlobalVariants(context, projectId, projectBundle.globalVariants);
  const componentBundles = projectBundle.components;
  await syncProjectConfig(
    context,
    projectBundle.projectConfig,
    projectVersion,
    dependencies,
    projectBundle.components,
    opts.forceOverwrite,
    !!opts.appendJsxOnMissingBase,
    summary,
    pendingMerge
  );
  upsertStyleTokens(context, projectBundle.usedTokens);

  // Sync icons
  // Resolution might pass back an empty array,
  // but calling projectIcons with an empty array returns all icons
  if (iconIds.length > 0) {
    const iconsResp = await context.api.projectIcons(
      projectId,
      projectVersion,
      iconIds
    );

    if (context.config.code.lang === "js") {
      iconsResp.icons.forEach((icon) => {
        [icon.fileName, icon.module] = maybeConvertTsxToJsx(
          icon.fileName,
          icon.module
        );
      });
    }
    syncProjectIconAssets(context, projectId, iconsResp.icons);
  }
}

const updateDirectSkeleton = async (
  newFileContent: string,
  editedFileContent: string,
  context: PlasmicContext,
  compConfig: ComponentConfig,
  forceOverwrite: boolean,
  nameInIdToUuid: [string, string][],
  appendJsxOnMissingBase: boolean
) => {
  // merge code!
  const componentByUuid = new Map<string, ComponentInfoForMerge>();

  componentByUuid.set(compConfig.id, {
    editedFile: editedFileContent,
    newFile: newFileContent,
    newNameInIdToUuid: new Map(nameInIdToUuid),
  });
  const mergedFiles = await mergeFiles(
    componentByUuid,
    compConfig.projectId,
    makeCachedProjectSyncDataProvider(async (projectId, revision) => {
      try {
        return await context.api.projectSyncMetadata(projectId, revision, true);
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
      force: true,
    });
  } else {
    if (!forceOverwrite) {
      throw new HandledError(
        `Cannot merge ${compConfig.importSpec.modulePath}. If you just switched the code scheme for the component from blackbox to direct, use --force-overwrite option to force the switch.`
      );
    } else {
      logger.warn(
        `Overwrite ${compConfig.importSpec.modulePath} despite merge failure`
      );
      writeFileContent(
        context,
        compConfig.importSpec.modulePath,
        newFileContent,
        {
          force: true,
        }
      );
    }
  }
};

async function syncProjectComponents(
  context: PlasmicContext,
  project: ProjectConfig,
  version: string,
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean,
  summary: Map<string, ComponentUpdateSummary>,
  pendingMerge: ComponentPendingMerge[]
) {
  const allCompConfigs = L.keyBy(project.components, (c) => c.id);
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
      nameInIdToUuid,
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
        scheme: scheme as "blackbox" | "direct",
      };
      allCompConfigs[id] = compConfig;
      project.components.push(allCompConfigs[id]);

      // Because it's the first time, we also generate the skeleton file.
      writeFileContent(context, skeletonModuleFileName, skeletonModule, {
        force: false,
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
        // We cannot merge right now, but wait until all the imports are resolved
        pendingMerge.push({
          skeletonModulePath: compConfig.importSpec.modulePath,
          editedSkeletonFile: editedFile,
          newSkeletonFile: skeletonModule,
          merge: async (resolvedNewFile, resolvedEditedFile) =>
            updateDirectSkeleton(
              resolvedNewFile,
              resolvedEditedFile,
              context,
              compConfig,
              forceOverwrite,
              nameInIdToUuid,
              appendJsxOnMissingBase
            ),
        });
        skeletonModuleModified = true;
      } else if (/\/\/\s*plasmic-managed-jsx\/\d+/.test(editedFile)) {
        if (forceOverwrite) {
          skeletonModuleModified = true;
          writeFileContent(
            context,
            compConfig.importSpec.modulePath,
            skeletonModule,
            {
              force: true,
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
      force: !isNew,
    });
    writeFileContent(context, compConfig.cssFilePath, cssRules, {
      force: !isNew,
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
    force: true,
  });
}

function syncGlobalVariants(
  context: PlasmicContext,
  projectId: string,
  bundles: GlobalVariantBundle[]
) {
  const allVariantConfigs = L.keyBy(
    context.config.globalVariants.variantGroups,
    (c) => c.id
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
        ),
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
  projectBundle: ProjectMetaBundle,
  version: string,
  dependencies: { [projectId: string]: string },
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean,
  summary: Map<string, ComponentUpdateSummary>,
  pendingMerge: ComponentPendingMerge[]
) {
  const defaultCssFilePath = path.join(
    context.config.defaultPlasmicDir,
    L.snakeCase(projectBundle.projectName),
    projectBundle.cssFileName
  );
  const isNew = !context.config.projects.find(
    (p) => p.projectId === projectBundle.projectId
  );

  // If latest, use that as the range, otherwise set to latest published (>=0.0.0)
  const versionRange = semver.isLatest(version) ? version : ">=0.0.0";
  const projectConfig = getOrAddProjectConfig(
    context,
    projectBundle.projectId,
    createProjectConfig({
      projectId: projectBundle.projectId,
      projectName: projectBundle.projectName,
      version: versionRange,
      cssFilePath: defaultCssFilePath,
    })
  );

  // Update missing/outdated props
  projectConfig.projectName = projectBundle.projectName;
  if (!projectConfig.cssFilePath) {
    projectConfig.cssFilePath = defaultCssFilePath;
  }

  // Write out project css
  writeFileContent(context, projectConfig.cssFilePath, projectBundle.cssRules, {
    force: !isNew,
  });

  // plasmic.lock
  const projectLock = getOrAddProjectLock(context, projectConfig.projectId);
  projectLock.version = version;
  projectLock.dependencies = dependencies;

  projectBundle.jsBundleThemes.forEach((theme) => {
    let themeConfig = projectConfig.jsBundleThemes.find(
      (c) => c.bundleName === theme.bundleName
    );
    if (!themeConfig) {
      const themeFilePath = path.join(
        context.config.defaultPlasmicDir,
        L.snakeCase(projectBundle.projectName),
        theme.themeFileName
      );
      themeConfig = { themeFilePath, bundleName: theme.bundleName };
      projectConfig.jsBundleThemes.push(themeConfig);
    }
    const formatted = formatAsLocal(
      theme.themeModule,
      themeConfig.themeFilePath
    );
    writeFileContent(context, themeConfig.themeFilePath, formatted, {
      force: true,
    });
  });

  // Write out components
  await syncProjectComponents(
    context,
    projectConfig,
    version,
    componentBundles,
    forceOverwrite,
    appendJsxOnMissingBase,
    summary,
    pendingMerge
  );
}
