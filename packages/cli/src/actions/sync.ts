import chalk from "chalk";
import { spawnSync } from "child_process";
import L from "lodash";
import path from "upath";
import { CommonArgs } from "..";
import {
  ChecksumBundle,
  CodeComponentMeta,
  ComponentBundle,
  ProjectIdAndToken,
  ProjectMetaBundle,
  StyleConfigResponse,
} from "../api";
import { logger } from "../deps";
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
  CONFIG_FILE_NAME,
  createProjectConfig,
  getOrAddProjectConfig,
  getOrAddProjectLock,
  LOADER_CONFIG_FILE_NAME,
  PlasmicContext,
  PlasmicLoaderConfig,
  updateConfig,
} from "../utils/config-utils";
import { HandledError } from "../utils/error";
import {
  assertAllPathsInRootDir,
  defaultResourcePath,
  existsBuffered,
  readFileText,
  renameFile,
  stripExtension,
  withBufferedFs,
  writeFileContent,
  writeFileText,
} from "../utils/file-utils";
import { generateMetadata, getContext, Metadata } from "../utils/get-context";
import { printFirstSyncInfo } from "../utils/help";
import { ensure, tuple } from "../utils/lang-utils";
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
import { syncGlobalContexts } from "./sync-global-contexts";
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
  loaderConfig?: string;
}

async function ensureRequiredPackages(
  context: PlasmicContext,
  baseDir: string,
  yes?: boolean
) {
  const requireds = await context.api.requiredPackages();

  const confirmInstall = async (
    pkg: string,
    requiredVersion: string,
    opts: { global: boolean; dev: boolean }
  ) => {
    let success = false;
    const command = installCommand(pkg, baseDir, opts);
    const upgrade = await confirmWithUser(
      `A more recent version of ${pkg} >=${requiredVersion} is required. Would you like to upgrade via "${command}"?`,
      yes
    );
    if (upgrade) {
      success = installUpgrade(pkg, baseDir, opts);
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

    logger.info(
      chalk.bold("@plasmicapp/cli has been upgraded; please try again!")
    );

    // Exit so the user can run again with the new cli
    throw new HandledError();
  }

  const reactWebVersion = findInstalledVersion(
    context,
    baseDir,
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

  const hostVersion = findInstalledVersion(
    context,
    baseDir,
    "@plasmicapp/host"
  );
  if (!hostVersion || semver.gt(requireds["@plasmicapp/host"], hostVersion)) {
    await confirmInstall("@plasmicapp/host", requireds["@plasmicapp/host"], {
      global: false,
      dev: false,
    });
  }

  if (context.config.code.reactRuntime === "automatic") {
    // Using automatic runtime requires installing the @plasmicapp/react-web-runtime package
    const runtimeVersion = findInstalledVersion(
      context,
      baseDir,
      "@plasmicapp/react-web-runtime"
    );
    if (
      !runtimeVersion ||
      semver.gt(requireds["@plasmicapp/react-web-runtime"], runtimeVersion)
    ) {
      await confirmInstall(
        "@plasmicapp/react-web-runtime",
        requireds["@plasmicapp/react-web-runtime"],
        { global: false, dev: false }
      );
    }
  }
}

function getLoaderConfigPath(opts: SyncArgs) {
  return opts.loaderConfig || LOADER_CONFIG_FILE_NAME;
}

function maybeReadLoaderConfig(opts: SyncArgs): Partial<PlasmicLoaderConfig> {
  const path = getLoaderConfigPath(opts);
  if (!existsBuffered(path)) {
    return {};
  }
  return JSON.parse(readFileText(path!));
}

function writeLoaderConfig(
  opts: SyncArgs,
  config: Partial<PlasmicLoaderConfig>
) {
  const loaderConfigPath = getLoaderConfigPath(opts);

  writeFileText(
    loaderConfigPath,
    formatAsLocal(JSON.stringify(config), loaderConfigPath, opts.baseDir)
  );
}

/**
 * Sync will always try to sync down a set of components that are version-consistent among specified projects.
 * (we only allow 1 version per projectId).
 * NOTE: the repo/plasmic.json might include projects with conflicting versions in its dependency tree.
 * We leave it to the user to sync all projects if they want us to catch/prevent this.
 * @param opts
 */
export async function sync(
  opts: SyncArgs,
  metadataDefaults?: Metadata
): Promise<void> {
  // Initially allow for a missing auth. Only require an auth once we need to fetch new or updated API tokens for any
  // projects.

  if (!opts.baseDir) opts.baseDir = process.cwd();
  const baseDir = opts.baseDir;
  let context = await getContext(opts, { enableSkipAuth: true });

  const isFirstRun = context.config.projects.length === 0;

  if (!opts.skipUpgradeCheck) {
    await ensureRequiredPackages(context, opts.baseDir, opts.yes);
  }

  fixFileExtension(context);
  assertAllPathsInRootDir(context);

  const loaderConfig: Partial<PlasmicLoaderConfig> = process.env.PLASMIC_LOADER
    ? maybeReadLoaderConfig(opts)
    : {};

  const projectIdToToken = new Map(
    [...context.config.projects, ...(loaderConfig?.projects ?? [])]
      .filter((p) => p.projectApiToken)
      .map((p) => tuple(p.projectId, p.projectApiToken))
  );

  // Resolve what will be synced
  const projectConfigMap = L.keyBy(context.config.projects, (p) => p.projectId);
  const projectWithVersion = opts.projects.map((p) => {
    const [projectIdToken, versionRange] = p.split("@");
    const [projectId, projectApiToken] = projectIdToken.split(":");
    return {
      projectId,
      versionRange:
        versionRange || projectConfigMap[projectId]?.version || "latest",
      componentIdOrNames: undefined, // Get all components!
      projectApiToken: projectApiToken || projectIdToToken.get(projectId),
      indirect: false,
    };
  });

  const projectSyncParams = projectWithVersion.length
    ? projectWithVersion
    : context.config.projects.map((p) => ({
        projectId: p.projectId,
        versionRange: p.version,
        componentIdOrNames: undefined, // Get all components!
        projectApiToken: p.projectApiToken,
        indirect: !!p.indirect,
      }));

  // Short-circuit if nothing to sync
  if (projectSyncParams.length === 0) {
    throw new HandledError(
      "Don't know which projects to sync. Please specify via --projects"
    );
  }

  // If there are any missing projectApiTokens, reload the context, this time requiring auth, so that we can fetch the
  // projectApiTokens from the server (as a user that has permission to do so).
  if (projectSyncParams.some((p) => !p.projectApiToken)) {
    try {
      context = await getContext(opts);
    } catch (e) {
      if ((e as any).message.includes("Unable to authenticate Plasmic")) {
        const configFileName = process.env.PLASMIC_LOADER
          ? LOADER_CONFIG_FILE_NAME
          : CONFIG_FILE_NAME;
        throw new HandledError(
          `Unable to authenticate Plasmic. Please run 'plasmic auth' or check the projectApiTokens in your ${configFileName}, and try again.`
        );
      }
    }
  }

  // Pass just the root IDs and tokens that we do have for the resolve call. (In reality it doesn't need any of this
  // because it only consults the projectApiToken within projectSyncParams; we could just attach [].)
  context.api.attachProjectIdsAndTokens(
    projectSyncParams.flatMap((p) =>
      p.projectApiToken
        ? [{ projectId: p.projectId, projectApiToken: p.projectApiToken }]
        : []
    )
  );

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
    logger.info(
      "Your projects are up-to-date with respect to your specified version ranges. Nothing to sync."
    );
    return;
  }
  const summary = new Map<string, ComponentUpdateSummary>();
  const pendingMerge = new Array<ComponentPendingMerge>();

  // The resolveSync call returns the project API tokens for all relevant projects (sources and dependencies).
  // resolveSync is what does this because it's what is computing all concrete versions to sync, and the dependency
  // graph can change with any version. Subsequent API calls require the exact API tokens, not to redo this work on each
  // call. Only resolveSync accepts just the API tokens for the root projects.
  //
  // We shouldn't simply use projectsToSync, because this list excludes up-to-date projects, but syncing a dependent
  // project still requires tokens to the dependencies.
  const projectIdsAndTokens = [
    ...versionResolution.projects,
    ...versionResolution.dependencies,
  ].map((p) => L.pick(p, "projectId", "projectApiToken"));

  context.api.attachProjectIdsAndTokens(projectIdsAndTokens);
  const externalNpmPackages = new Set<string>();
  const externalCssImports = new Set<string>();

  // Perform the actual sync
  await withBufferedFs(async () => {
    // Sync in sequence (no parallelism)
    // going in reverse to get leaves of the dependency tree first
    for (const projectMeta of projectsToSync) {
      await syncProject(
        context,
        opts,
        projectIdsAndTokens,
        projectMeta.projectId,
        projectMeta.componentIds,
        projectMeta.version,
        projectMeta.dependencies,
        summary,
        pendingMerge,
        projectMeta.indirect,
        externalNpmPackages,
        externalCssImports,
        metadataDefaults
      );
    }

    // Materialize scheme into each component config.
    context.config.projects.forEach((p) =>
      p.components.forEach((c) => {
        if (c.type === "managed" && !c.scheme) {
          c.scheme = context.config.code.scheme;
        }
      })
    );

    await syncStyleConfig(
      context,
      await context.api.genStyleConfig(context.config.style)
    );

    // Update project version and indirect status if specified and
    // successfully synced.
    if (projectWithVersion.length) {
      const versionMap: Record<string, string> = {};
      projectWithVersion.forEach(
        (p) => (versionMap[p.projectId] = p.versionRange)
      );
      const indirectMap: Record<string, boolean> = {};
      projectsToSync.forEach((p) => (indirectMap[p.projectId] = p.indirect));
      context.config.projects.forEach((p) => {
        p.version = versionMap[p.projectId] || p.version;
        // Only update `indirect` if it is set in current config.
        if (p.projectId in indirectMap && p.indirect) {
          p.indirect = indirectMap[p.projectId];
        }
      });
    }

    // Fix imports
    const fixImportContext = mkFixImportContext(context.config);
    for (const m of pendingMerge) {
      const resolvedEditedFile = replaceImports(
        context,
        m.editedSkeletonFile,
        m.skeletonModulePath,
        fixImportContext,
        true,
        baseDir
      );
      const resolvedNewFile = replaceImports(
        context,
        m.newSkeletonFile,
        m.skeletonModulePath,
        fixImportContext,
        true,
        baseDir
      );
      await m.merge(resolvedNewFile, resolvedEditedFile);
    }
    // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
    await fixAllImportStatements(context, opts.baseDir, summary);

    if (process.env.PLASMIC_LOADER) {
      const rootProjectIds = new Set(projectSyncParams.map((p) => p.projectId));
      const freshIdsAndTokens = projectIdsAndTokens
        .filter((p) => rootProjectIds.has(p.projectId))
        .map((p) => L.pick(p, "projectId", "projectApiToken"));

      const config: Partial<PlasmicLoaderConfig> = {
        ...loaderConfig,
        projects: L.sortBy(
          L.uniqBy(
            [...freshIdsAndTokens, ...(loaderConfig?.projects ?? [])],
            (p) => p.projectId
          ),
          (p) => p.projectId
        ),
      };

      writeLoaderConfig(opts, config);
    }

    const codegenVersion = await context.api.latestCodegenVersion();
    context.lock.projects.forEach((p) => {
      if (
        projectsToSync.some(
          (syncedProject) => syncedProject.projectId === p.projectId
        )
      ) {
        p.codegenVersion = codegenVersion;
      }
    });
    // Write the new ComponentConfigs to disk
    await updateConfig(context, context.config, baseDir);
  });

  await checkExternalPkgs(
    context,
    baseDir,
    opts,
    Array.from(externalNpmPackages.keys())
  );

  if (!opts.quiet && externalCssImports.size > 0) {
    logger.info(
      chalk.cyanBright.bold(
        `IMPORTANT: This project uses external packages and styles. Make sure to import the following global CSS: ` +
          Array.from(externalCssImports.keys())
            .map((stmt) => `"${stmt}"`)
            .join(", ")
      )
    );
  }

  // Post-sync commands
  if (!opts.ignorePostSync) {
    for (const cmd of context.config.postSyncCommands || []) {
      spawnSync(cmd, { shell: true, stdio: "inherit" });
    }
  }

  if (isFirstRun) {
    if (!process.env.QUIET) {
      printFirstSyncInfo(context);
    }
  }
}

async function checkExternalPkgs(
  context: PlasmicContext,
  baseDir: string,
  opts: SyncArgs,
  pkgs: string[]
) {
  const missingPkgs = pkgs.filter((pkg) => {
    const installedPkg = findInstalledVersion(context, baseDir, pkg);
    return !installedPkg;
  });
  if (missingPkgs.length > 0) {
    const upgrade = await confirmWithUser(
      `The following packages aren't installed but are required by some projects, would you like to install them? ${missingPkgs.join(
        ", "
      )}`,
      opts.yes
    );

    if (upgrade) {
      installUpgrade(missingPkgs.join(" "), baseDir);
    }
  }
}

function maybeRenamePathExt(
  context: PlasmicContext,
  path: string,
  ext: string,
  opts?: {
    continueOnFailure?: boolean;
  }
) {
  if (!path) {
    return path;
  }
  const correctPath = `${stripExtension(path, true)}${ext}`;
  if (path !== correctPath) {
    try {
      renameFile(context, path, correctPath);
    } catch (e) {
      if (!opts?.continueOnFailure) {
        throw e;
      } else {
        logger.warn(e);
      }
    }
  }
  return correctPath;
}

function fixFileExtension(context: PlasmicContext) {
  const cssExt =
    context.config.style.scheme === "css-modules" ? ".module.css" : ".css";
  context.config.style.defaultStyleCssFilePath = maybeRenamePathExt(
    context,
    context.config.style.defaultStyleCssFilePath,
    cssExt,
    { continueOnFailure: true }
  );
  context.config.projects.forEach((project) => {
    project.cssFilePath = maybeRenamePathExt(
      context,
      project.cssFilePath,
      cssExt,
      { continueOnFailure: true }
    );
    project.components.forEach((component) => {
      component.cssFilePath = maybeRenamePathExt(
        context,
        component.cssFilePath,
        cssExt,
        { continueOnFailure: true }
      );
    });
  });
}

async function syncProject(
  context: PlasmicContext,
  opts: SyncArgs,
  projectIdsAndTokens: ProjectIdAndToken[],
  projectId: string,
  componentIds: string[],
  projectVersion: string,
  dependencies: { [projectId: string]: string },
  summary: Map<string, ComponentUpdateSummary>,
  pendingMerge: ComponentPendingMerge[],
  indirect: boolean,
  externalNpmPackages: Set<string>,
  externalCssImports: Set<string>,
  metadataDefaults?: Metadata
): Promise<void> {
  const newComponentScheme =
    opts.newComponentScheme || context.config.code.scheme;
  const existingProject = context.config.projects.find(
    (p) => p.projectId === projectId
  );
  const existingCompScheme: Array<[string, "blackbox" | "direct"]> = (
    existingProject?.components || []
  ).map((c) => [c.id, c.scheme]);

  const projectApiToken = ensure(
    projectIdsAndTokens.find((p) => p.projectId === projectId)?.projectApiToken,
    `Could not find the API token for project ${projectId} in list: ${JSON.stringify(
      projectIdsAndTokens
    )}`
  );

  const existingChecksums = getChecksums(
    context,
    opts,
    projectId,
    componentIds
  );

  // Server-side code-gen
  const projectBundle = await context.api.projectComponents(projectId, {
    platform: context.config.platform,
    newCompScheme: newComponentScheme,
    existingCompScheme,
    componentIdOrNames: componentIds,
    version: projectVersion,
    imageOpts: context.config.images,
    stylesOpts: context.config.style,
    checksums: existingChecksums,
    codeOpts: context.config.code,
    metadata: generateMetadata(
      {
        ...metadataDefaults,
        platform: context.config.platform,
      },
      opts.metadata
    ),
    indirect,
    wrapPagesWithGlobalContexts: context.config.wrapPagesWithGlobalContexts,
  });

  // Convert from TSX => JSX
  if (context.config.code.lang === "js") {
    projectBundle.components.forEach((c) => {
      [c.renderModuleFileName, c.renderModule] = maybeConvertTsxToJsx(
        c.renderModuleFileName,
        c.renderModule,
        opts.baseDir
      );
      [c.skeletonModuleFileName, c.skeletonModule] = maybeConvertTsxToJsx(
        c.skeletonModuleFileName,
        c.skeletonModule,
        opts.baseDir
      );
    });
    projectBundle.iconAssets.forEach((icon) => {
      [icon.fileName, icon.module] = maybeConvertTsxToJsx(
        icon.fileName,
        icon.module,
        opts.baseDir
      );
    });
    projectBundle.globalVariants.forEach((gv) => {
      [gv.contextFileName, gv.contextModule] = maybeConvertTsxToJsx(
        gv.contextFileName,
        gv.contextModule,
        opts.baseDir
      );
    });
    (projectBundle.projectConfig.jsBundleThemes || []).forEach((theme) => {
      [theme.themeFileName, theme.themeModule] = maybeConvertTsxToJsx(
        theme.themeFileName,
        theme.themeModule,
        opts.baseDir
      );
    });
  }
  await syncGlobalVariants(
    context,
    projectBundle.projectConfig,
    projectBundle.globalVariants,
    projectBundle.checksums,
    opts.baseDir
  );

  await syncProjectConfig(
    context,
    projectBundle.projectConfig,
    projectApiToken,
    projectVersion,
    dependencies,
    projectBundle.components,
    opts.forceOverwrite,
    !!opts.appendJsxOnMissingBase,
    summary,
    pendingMerge,
    projectBundle.checksums,
    opts.baseDir,
    indirect
  );
  syncCodeComponentsMeta(context, projectId, projectBundle.codeComponentMetas);
  await upsertStyleTokens(
    context,
    projectBundle.usedTokens,
    projectBundle.projectConfig.projectId
  );
  await syncProjectIconAssets(
    context,
    projectId,
    projectVersion,
    projectBundle.iconAssets,
    projectBundle.checksums,
    opts.baseDir
  );
  await syncProjectImageAssets(
    context,
    projectId,
    projectVersion,
    projectBundle.imageAssets,
    projectBundle.checksums
  );
  (projectBundle.usedNpmPackages || []).forEach((pkg) =>
    externalNpmPackages.add(pkg)
  );
  (projectBundle.externalCssImports || []).forEach((css) =>
    externalCssImports.add(css)
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
  projectApiToken: string,
  version: string,
  dependencies: { [projectId: string]: string },
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean,
  summary: Map<string, ComponentUpdateSummary>,
  pendingMerge: ComponentPendingMerge[],
  checksums: ChecksumBundle,
  baseDir: string,
  indirect: boolean
) {
  const defaultCssFilePath = defaultResourcePath(
    context,
    projectBundle.projectName,
    projectBundle.cssFileName
  );
  const isNew = !context.config.projects.find(
    (p) => p.projectId === projectBundle.projectId
  );

  const projectConfig = getOrAddProjectConfig(
    context,
    projectBundle.projectId,
    createProjectConfig({
      projectId: projectBundle.projectId,
      projectApiToken,
      projectName: projectBundle.projectName,
      version,
      cssFilePath: defaultCssFilePath,
      indirect,
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
      projectConfig.cssFilePath,
      baseDir
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

  /*
  for (const theme of projectBundle.jsBundleThemes) {
    if (!projectConfig.jsBundleThemes) {
      projectConfig.jsBundleThemes = [];
    }
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
    await writeFileContent(context, themeConfig.themeFilePath, formatted, {
      force: true,
    });
  }
  */

  if (
    projectConfig.jsBundleThemes &&
    projectConfig.jsBundleThemes.length === 0
  ) {
    delete projectConfig.jsBundleThemes;
  }

  await syncGlobalContexts(
    context,
    projectBundle,
    projectConfig,
    projectLock,
    checksums,
    baseDir
  );

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
    checksums,
    baseDir
  );
}

function syncCodeComponentsMeta(
  context: PlasmicContext,
  projectId: string,
  codeComponentBundles: CodeComponentMeta[]
) {
  const projectConfig = getOrAddProjectConfig(context, projectId);

  projectConfig.codeComponents = codeComponentBundles.map((meta) => ({
    id: meta.id,
    name: meta.name,
    componentImportPath: meta.importPath,
  }));
}
