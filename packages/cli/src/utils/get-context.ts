import * as Sentry from "@sentry/node";
import * as querystring from "querystring";
import path from "upath";
import { initPlasmic } from "../actions/init";
import { PlasmicApi } from "../api";
import { logger } from "../deps";
import { CommonArgs } from "../index";
import { runNecessaryMigrations } from "../migrations/migrations";
import { HandledError } from "../utils/error";
import { getCurrentAuth } from "./auth-utils";
import {
  DEFAULT_HOST,
  findConfigFile,
  LOCK_FILE_NAME,
  PlasmicContext,
  PlasmicConfig,
  PlasmicLock,
  readConfig,
} from "./config-utils";
import { existsBuffered, fileExists, readFileText } from "./file-utils";
import { ensure } from "./lang-utils";
import { getCliVersion } from "./npm-utils";

function createPlasmicLock(): PlasmicLock {
  return {
    projects: [],
    cliVersion: getCliVersion(),
  };
}

export function readLock(lockFile: string): PlasmicLock {
  if (!existsBuffered(lockFile)) {
    return createPlasmicLock();
  }
  try {
    const result = JSON.parse(readFileText(lockFile!)) as PlasmicLock;
    return {
      ...result,
    };
  } catch (e) {
    logger.error(
      `Error encountered reading ${LOCK_FILE_NAME} at ${lockFile}: ${e}`
    );
    throw e;
  }
}

function removeMissingFilesFromLock(
  context: PlasmicContext,
  config: PlasmicConfig,
  lock: PlasmicLock
) {
  const knownProjects = Object.fromEntries(
    config.projects.map((project) => [project.projectId, project])
  );
  const knownGlobalVariants = Object.fromEntries(
    context.config.globalVariants.variantGroups.map((vg) => [vg.projectId, vg])
  );
  lock.projects = lock.projects
    .filter((project) => knownProjects[project.projectId])
    .map((project) => {
      const knownComponents = Object.fromEntries(
        knownProjects[project.projectId].components.map((component) => [
          component.id,
          component,
        ])
      );
      const knownImages = Object.fromEntries(
        knownProjects[project.projectId].images.map((image) => [
          image.id,
          image,
        ])
      );
      const knownIcons = Object.fromEntries(
        knownProjects[project.projectId].images.map((icons) => [
          icons.id,
          icons,
        ])
      );
      const knownJsBundle = Object.fromEntries(
        knownProjects[project.projectId].jsBundleThemes.map((theme) => [
          theme.bundleName,
          theme,
        ])
      );

      project.fileLocks = project.fileLocks.filter((lock) => {
        switch (lock.type) {
          default:
            return false;
          case "projectCss":
            return knownProjects[project.projectId].cssFilePath;
          case "globalVariant":
            return knownGlobalVariants[project.projectId];
          case "cssRules":
          case "renderModule":
            return knownComponents[lock.assetId];
          case "image":
            return knownImages[lock.assetId];
          case "icon":
            return knownIcons[lock.assetId];
          case "theme":
            return knownJsBundle[lock.assetId];
        }
      });

      return project;
    });
}

function removeMissingFilesFromConfig(
  context: PlasmicContext,
  config: PlasmicConfig
) {
  function filterFiles<T>(list: T[], getPath: (item: T) => string) {
    return list.filter((element) => {
      const filePath = getPath(element);
      if (fileExists(context, filePath)) {
        return true;
      }
      logger.error(
        `File ${path.join(
          context.absoluteSrcDir,
          filePath
        )} not found. Removing from plasmic.json...`
      );
      return false;
    });
  }

  context.config.globalVariants.variantGroups = filterFiles(
    context.config.globalVariants.variantGroups,
    (variant) => variant.contextFilePath
  );

  context.config.style.defaultStyleCssFilePath =
    filterFiles(
      [context.config.style.defaultStyleCssFilePath],
      (file) => file
    )[0] || "";

  for (const project of config.projects) {
    project.cssFilePath =
      filterFiles([project.cssFilePath], (file) => file)[0] || "";

    project.images = filterFiles(project.images, (image) => image.filePath);
    project.icons = filterFiles(project.icons, (icon) => icon.moduleFilePath);
    project.components = filterFiles(
      project.components,
      (comp) => comp.renderModuleFilePath
    );
    project.components = filterFiles(
      project.components,
      (comp) => comp.importSpec.modulePath
    );
    project.components = filterFiles(
      project.components,
      (comp) => comp.cssFilePath
    );
    project.jsBundleThemes = filterFiles(
      project.jsBundleThemes,
      (theme) => theme.themeFilePath
    );
  }
}

export async function getContext(args: CommonArgs): Promise<PlasmicContext> {
  const auth = await getOrInitAuth(args);

  /** Sentry */
  if (auth.host.startsWith(DEFAULT_HOST)) {
    // Production usage of cli
    Sentry.init({
      dsn:
        "https://3ed4eb43d28646e381bf3c50cff24bd6@o328029.ingest.sentry.io/5285892",
    });
    Sentry.configureScope((scope) => {
      scope.setUser({ email: auth.user });
      scope.setExtra("cliVersion", getCliVersion());
      scope.setExtra("args", JSON.stringify(args));
      scope.setExtra("host", auth.host);
    });
  }

  /** PlasmicConfig **/
  let configFile =
    args.config || findConfigFile(process.cwd(), { traverseParents: true });

  if (!configFile) {
    await maybeRunPlasmicInit(args, "plasmic.json");
    configFile = findConfigFile(process.cwd(), { traverseParents: true });
    if (!configFile) {
      const err = new HandledError(
        "No plasmic.json file found. Please run `plasmic init` first."
      );
      throw err;
    }
  }
  const rootDir = path.dirname(configFile);
  // plasmic.lock should be in the same directory as plasmic.json
  const lockFile = path.join(rootDir, LOCK_FILE_NAME);

  await runNecessaryMigrations(configFile, lockFile, args.yes);
  const config = readConfig(configFile, true);

  /** PlasmicLock */
  const lock = readLock(lockFile);

  const context = {
    config,
    configFile,
    lock,
    lockFile,
    rootDir,
    absoluteSrcDir: path.isAbsolute(config.srcDir)
      ? config.srcDir
      : path.resolve(rootDir, config.srcDir),
    auth,
    api: new PlasmicApi(auth),
    cliArgs: args,
  };

  removeMissingFilesFromConfig(context, config);
  removeMissingFilesFromLock(context, config, lock);

  return context;
}

async function getOrInitAuth(args: CommonArgs) {
  const auth = await getCurrentAuth(args.auth);

  if (auth) {
    return auth;
  }

  if (await maybeRunPlasmicInit(args, ".plasmic.auth")) {
    return ensure(await getCurrentAuth());
  }

  // Could not find the authentication credentials and the user
  // declined to run plasmic init.
  process.exit(1);
}

export async function maybeRunPlasmicInit(
  args: CommonArgs,
  missingFile: string
): Promise<boolean> {
  console.log(`No ${missingFile} file found. Initializing plasmic...`);

  await initPlasmic({
    host: DEFAULT_HOST,
    platform: "",
    codeLang: "",
    codeScheme: "",
    styleScheme: "",
    imagesScheme: "",
    srcDir: "",
    plasmicDir: "",
    imagesPublicDir: "",
    imagesPublicUrlPrefix: "",
    ...args,
  });
  return true;
}

/**
 * Create a metadata bundle
 * This will be used to tag Segment events (e.g. for codegen)
 * 
 * @param fromArgs 
 */
export function generateMetadata(context: PlasmicContext, fromArgs?: string) {
  // The following come from CLI args:
  // - source=[cli, loader]
  // - command=[watch]
  const metadata = !fromArgs ? {} :
    { ...querystring.decode(fromArgs) };

  metadata.platform = context.config.platform;
  return metadata;
}