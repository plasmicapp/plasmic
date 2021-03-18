import chalk from "chalk";
import { spawnSync } from "child_process";
import L from "lodash";
import path from "upath";
import { CommonArgs } from "..";
import {
  ChecksumBundle,
  ComponentBundle,
  ProjectMetaBundle,
  StyleConfigResponse,
} from "../api";
import { getChecksums } from "../utils/checksum";
import {
  ComponentUpdateSummary,
  fixAllImportStatements,
  formatAsLocal,
  maybeConvertTsxToJsx,
  mkFixImportContext,
  replaceImports,
} from "../utils/code-utils";
import {
  createProjectConfig,
  getOrAddProjectConfig,
  getOrAddProjectLock,
  PlasmicContext,
  updateConfig,
} from "../utils/config-utils";
import { HandledError } from "../utils/error";
import {
  assertAllPathsInRootDir,
  createMissingIndexPage,
  defaultResourcePath,
  renameFile,
  stripExtension,
  withBufferedFs,
  writeFileContent,
} from "../utils/file-utils";
import { generateMetadata, getContext } from "../utils/get-context";
import { printFirstSyncInfo } from "../utils/help";
import { ensure } from "../utils/lang-utils";
import {
  findInstalledVersion,
  getCliVersion,
  installCommand,
  installUpgrade,
  isCliGloballyInstalled,
} from "../utils/npm-utils";
import { checkVersionResolution } from "../utils/resolve-utils";
import * as semver from "../utils/semver";
import { confirmWithUser } from "../utils/user-utils";
import {
  ComponentPendingMerge,
  syncProjectComponents,
} from "./sync-components";
import { syncGlobalVariants } from "./sync-global-variants";
import { syncProjectIconAssets } from "./sync-icons";
import { syncProjectImageAssets } from "./sync-images";
import { upsertStyleTokens } from "./sync-styles";

export interface SyncArgs extends CommonArgs {
  projects: readonly string[];
  forceOverwrite: boolean;
  newComponentScheme?: "blackbox" | "direct";
  appendJsxOnMissingBase?: boolean;
  yes?: boolean;
  force?: boolean;
  nonRecursive?: boolean;
  skipUpgradeCheck?: boolean;
  ignorePostSync?: boolean;
  quiet?: boolean;
  metadata?: string;
  allFiles?: boolean;
}

async function ensureRequiredPackages(context: PlasmicContext, yes?: boolean) {
  const requireds = await context.api.requiredPackages();

  const confirmInstall = async (
    pkg: string,
    requiredVersion: string,
    opts: { global: boolean; dev: boolean }
  ) => {
    let success = false;
    const command = installCommand(pkg, opts);
    const upgrade = await confirmWithUser(
      `A more recent version of ${pkg} >=${requiredVersion} is required. Would you like to upgrade via "${command}"?`,
      yes
    );
    if (upgrade) {
      success = installUpgrade(pkg, opts);
    } else {
      success = false;
    }

    if (!success) {
      throw new HandledError(`Upgrading ${pkg} is required to continue.`);
    }
  };

  const cliVersion = getCliVersion();
  if (!cliVersion || semver.gt(requireds["@plasmicapp/cli"], cliVersion)) {
    const isGlobal = isCliGloballyInstalled(context.rootDir);
    await confirmInstall("@plasmicapp/cli", requireds["@plasmicapp/cli"], {
      global: isGlobal,
      dev: true,
    });

    // Exit so the user can run again with the new cli
    console.log(
      chalk.bold(`@plasmicapp/cli has been upgraded; please try again`)
    );
    process.exit();
  }

  const reactWebVersion = findInstalledVersion(
    context,
    "@plasmicapp/react-web"
  );
  if (
    !reactWebVersion ||
    semver.gt(requireds["@plasmicapp/react-web"], reactWebVersion)
  ) {
    await confirmInstall(
      "@plasmicapp/react-web",
      requireds["@plasmicapp/react-web"],
      { global: false, dev: false }
    );
  }
}

/**
 * Sync will always try to sync down a set of components that are version-consistent among specified projects.
 * (we only allow 1 version per projectId).
 * NOTE: the repo/plasmic.json might include projects with conflicting versions in its dependency tree.
 * We leave it to the user to sync all projects if they want us to catch/prevent this.
 * @param opts
 */
export async function sync(opts: SyncArgs): Promise<void> {
  const context = await getContext(opts);

  const isFirstRun = context.config.projects.length === 0;

  if (!opts.skipUpgradeCheck) {
    await ensureRequiredPackages(context, opts.yes);
  }

  fixFileExtension(context);
  assertAllPathsInRootDir(context);

  // Resolve what will be synced
  const projectConfigMap = L.keyBy(context.config.projects, (p) => p.projectId);
  const projectWithVersion = opts.projects.map((p) => {
    const [projectId, versionRange] = p.split("@");
    return {
      projectId,
      versionRange:
        versionRange || projectConfigMap[projectId]?.version || "latest",
      componentIdOrNames: undefined, // Get all components!
    };
  });

  const projectSyncParams = projectWithVersion.length
    ? projectWithVersion
    : context.config.projects.map((p) => ({
        projectId: p.projectId,
        versionRange: p.version,
        componentIdOrNames: undefined, // Get all components!
      }));

  // Short-circuit if nothing to sync
  if (projectSyncParams.length === 0) {
    throw new HandledError(
      "Don't know which projects to sync. Please specify via --projects"
    );
  }

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
        projectMeta.version,
        projectMeta.dependencies,
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

    await syncStyleConfig(
      context,
      await context.api.genStyleConfig(context.config.style)
    );

    // Update project version if specified and successfully synced.
    if (projectWithVersion.length) {
      const versionMap: Record<string, string> = {};
      projectWithVersion.forEach(
        (p) => (versionMap[p.projectId] = p.versionRange)
      );
      context.config.projects.forEach(
        (p) => (p.version = versionMap[p.projectId] || p.version)
      );
    }

    // Write the new ComponentConfigs to disk
    await updateConfig(context, context.config);

    // Fix imports
    const fixImportContext = mkFixImportContext(context.config);
    for (const m of pendingMerge) {
      const resolvedEditedFile = replaceImports(
        context,
        m.editedSkeletonFile,
        m.skeletonModulePath,
        fixImportContext,
        true
      );
      const resolvedNewFile = replaceImports(
        context,
        m.newSkeletonFile,
        m.skeletonModulePath,
        fixImportContext,
        true
      );
      await m.merge(resolvedNewFile, resolvedEditedFile);
    }
    // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
    await fixAllImportStatements(context, summary);
  });

  // Post-sync commands
  if (!opts.ignorePostSync) {
    for (const cmd of context.config.postSyncCommands || []) {
      spawnSync(cmd, { shell: true, stdio: "inherit" });
    }
  }

  if (isFirstRun) {
    printFirstSyncInfo(context);
    await createMissingIndexPage(context);
  }
}

function maybeRenamePathExt(
  context: PlasmicContext,
  path: string,
  ext: string
) {
  if (!path) {
    return path;
  }
  const correctPath = `${stripExtension(path, true)}${ext}`;
  if (path !== correctPath) {
    renameFile(context, path, correctPath);
  }
  return correctPath;
}

function fixFileExtension(context: PlasmicContext) {
  const cssExt =
    context.config.style.scheme === "css-modules" ? ".module.css" : ".css";
  context.config.style.defaultStyleCssFilePath = maybeRenamePathExt(
    context,
    context.config.style.defaultStyleCssFilePath,
    cssExt
  );
  context.config.projects.forEach((project) => {
    project.cssFilePath = maybeRenamePathExt(
      context,
      project.cssFilePath,
      cssExt
    );
    project.components.forEach((component) => {
      component.cssFilePath = maybeRenamePathExt(
        context,
        component.cssFilePath,
        cssExt
      );
    });
  });
}

async function syncProject(
  context: PlasmicContext,
  opts: SyncArgs,
  projectId: string,
  componentIds: string[],
  projectVersion: string,
  dependencies: { [projectId: string]: string },
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

  const existingChecksums = getChecksums(
    context,
    opts,
    projectId,
    componentIds
  );

  // Server-side code-gen
  const projectBundle = await context.api.projectComponents(
    projectId,
    context.config.platform,
    newComponentScheme,
    existingCompScheme,
    componentIds,
    projectVersion,
    context.config.images,
    context.config.style,
    existingChecksums,
    generateMetadata(context, opts.metadata)
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
  await syncGlobalVariants(
    context,
    projectBundle.projectConfig,
    projectBundle.globalVariants,
    projectBundle.checksums
  );

  await syncProjectConfig(
    context,
    projectBundle.projectConfig,
    projectVersion,
    dependencies,
    projectBundle.components,
    opts.forceOverwrite,
    !!opts.appendJsxOnMissingBase,
    summary,
    pendingMerge,
    projectBundle.checksums
  );
  await upsertStyleTokens(context, projectBundle.usedTokens);
  await syncProjectIconAssets(
    context,
    projectId,
    projectVersion,
    projectBundle.iconAssets,
    projectBundle.checksums
  );
  await syncProjectImageAssets(
    context,
    projectId,
    projectVersion,
    projectBundle.imageAssets,
    projectBundle.checksums
  );
}

async function syncStyleConfig(
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
  await writeFileContent(context, expectedPath, response.defaultStyleCssRules, {
    force: true,
  });
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
  pendingMerge: ComponentPendingMerge[],
  checksums: ChecksumBundle
) {
  const defaultCssFilePath = defaultResourcePath(
    context,
    projectBundle.projectName,
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

  // plasmic.lock
  const projectLock = getOrAddProjectLock(context, projectConfig.projectId);
  projectLock.version = version;
  projectLock.dependencies = dependencies;
  projectLock.lang = context.config.code.lang;

  if (projectBundle.cssRules) {
    const formattedCssRules = formatAsLocal(
      projectBundle.cssRules,
      projectConfig.cssFilePath
    );

    // Write out project css
    await writeFileContent(
      context,
      projectConfig.cssFilePath,
      formattedCssRules,
      {
        force: !isNew,
      }
    );
  }
  projectLock.fileLocks = projectLock.fileLocks.filter(
    (fileLock) => fileLock.type !== "projectCss"
  );
  projectLock.fileLocks.push({
    assetId: projectConfig.projectId,
    type: "projectCss",
    checksum: checksums.projectCssChecksum,
  });

  const themeFileLocks = L.keyBy(
    projectLock.fileLocks.filter((fileLock) => fileLock.type === "theme"),
    (fl) => fl.assetId
  );
  const id2themeChecksum = new Map(checksums.themeChecksums);
  for (const theme of projectBundle.jsBundleThemes) {
    let themeConfig = projectConfig.jsBundleThemes.find(
      (c) => c.bundleName === theme.bundleName
    );
    if (!themeConfig) {
      const themeFilePath = defaultResourcePath(
        context,
        projectConfig,
        theme.themeFileName
      );
      themeConfig = { themeFilePath, bundleName: theme.bundleName };
      projectConfig.jsBundleThemes.push(themeConfig);
    }
    const formatted = formatAsLocal(
      theme.themeModule,
      themeConfig.themeFilePath
    );
    // Update FileLocks
    if (themeFileLocks[theme.bundleName]) {
      themeFileLocks[theme.bundleName].checksum = ensure(
        id2themeChecksum.get(theme.bundleName)
      );
    } else {
      projectLock.fileLocks.push({
        type: "theme",
        assetId: theme.bundleName,
        checksum: ensure(id2themeChecksum.get(theme.bundleName)),
      });
    }
    await writeFileContent(context, themeConfig.themeFilePath, formatted, {
      force: true,
    });
  }

  // Write out components
  await syncProjectComponents(
    context,
    projectConfig,
    version,
    componentBundles,
    forceOverwrite,
    appendJsxOnMissingBase,
    summary,
    pendingMerge,
    projectLock,
    checksums
  );
}
