import * as Sentry from "@sentry/node";
import L from "lodash";
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
  PlasmicConfig,
  PlasmicContext,
  PlasmicLock,
  readConfig,
} from "./config-utils";
import {
  buildBaseNameToFiles,
  existsBuffered,
  fileExists,
  readFileText,
} from "./file-utils";
import { ensure } from "./lang-utils";
import { getCliVersion } from "./npm-utils";
import * as prompts from "./prompts";

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
        }
      });

      return project;
    });
}

async function attemptToRestoreFilePath(
  context: PlasmicContext,
  expectedPath: string,
  baseNameToFiles: Record<string, string[]>
) {
  // If the path is not set, always recreate.
  if (expectedPath === "") {
    return undefined;
  }

  if (fileExists(context, expectedPath)) {
    return expectedPath;
  }
  const fileName = path.basename(expectedPath);
  if (!baseNameToFiles[fileName]) {
    const answer = await prompts.askChoice({
      message: `File ${path.join(
        context.absoluteSrcDir,
        expectedPath
      )} not found. Do you want to recreate it?`,
      choices: ["Yes", "No"],
      defaultAnswer: "Yes",
      hidePrompt: context.cliArgs.yes,
    });

    if (answer === "No") {
      throw new HandledError(
        "Please add this file or update your plasmic.json by removing or changing this path and try again."
      );
    }
    return undefined;
  }

  if (baseNameToFiles[fileName].length === 1) {
    const newPath = path.relative(
      context.absoluteSrcDir,
      baseNameToFiles[fileName][0]
    );
    logger.info(`\tDetected file moved from ${expectedPath} to ${newPath}.`);
    return newPath;
  }

  // Multiple files
  const none = "None.";
  const answer = await prompts.askChoice({
    message: `Cannot find expected file at ${expectedPath}. Please select one of the following matches:`,
    choices: [...baseNameToFiles[fileName], none],
    defaultAnswer: none,
    hidePrompt: context.cliArgs.yes,
  });

  if (answer === none) {
    throw new HandledError(
      "Please add this file or update your plasmic.json by removing or changing this path and try again."
    );
  }
  return answer;
}

async function resolveMissingFilesInConfig(
  context: PlasmicContext,
  config: PlasmicConfig
) {
  const baseNameToFiles = buildBaseNameToFiles(context);

  // Make sure all the files exist. Prompt the user / exit process if not.
  async function filterFiles<T>(list: T[], pathProp: keyof T) {
    const newList = [];
    for (const item of list) {
      const newPath = await attemptToRestoreFilePath(
        context,
        item[pathProp] as any,
        baseNameToFiles
      );
      if (newPath) {
        item[pathProp] = newPath as any;
        newList.push(item);
      }
    }
    return newList;
  }

  context.config.globalVariants.variantGroups = await filterFiles(
    context.config.globalVariants.variantGroups,
    "contextFilePath"
  );

  context.config.style.defaultStyleCssFilePath =
    (await attemptToRestoreFilePath(
      context,
      context.config.style.defaultStyleCssFilePath,
      baseNameToFiles
    )) || "";

  for (const project of config.projects) {
    project.cssFilePath =
      (await attemptToRestoreFilePath(
        context,
        project.cssFilePath,
        baseNameToFiles
      )) || "";

    project.images = await filterFiles(project.images, "filePath");
    project.icons = await filterFiles(project.icons, "moduleFilePath");
    project.jsBundleThemes = await filterFiles(
      project.jsBundleThemes || [],
      "themeFilePath"
    );

    // For components, if they decide to recreate in any of the path (css, wrapper, or blackbox component)
    // we'll delete existing files.

    const newComponents = [];
    for (const component of project.components) {
      const newModulePath = await attemptToRestoreFilePath(
        context,
        component.importSpec.modulePath,
        baseNameToFiles
      );
      if (!newModulePath) {
        continue;
      }
      const newRenderModulePath = await attemptToRestoreFilePath(
        context,
        component.renderModuleFilePath,
        baseNameToFiles
      );

      if (!newRenderModulePath) {
        continue;
      }

      const newCssPath = await attemptToRestoreFilePath(
        context,
        component.cssFilePath,
        baseNameToFiles
      );

      if (!newCssPath) {
        continue;
      }

      component.importSpec.modulePath = newModulePath;
      component.renderModuleFilePath = newRenderModulePath;
      component.cssFilePath = newCssPath;
      newComponents.push(component);
    }
    project.components = newComponents;
  }
}

export async function getContext(
  args: CommonArgs,
  { enableSkipAuth = false }: { enableSkipAuth?: boolean } = {}
): Promise<PlasmicContext> {
  const auth = enableSkipAuth
    ? await getCurrentOrDefaultAuth(args)
    : await getOrInitAuth(args);

  /** Sentry */
  if (auth.host.startsWith(DEFAULT_HOST)) {
    // Production usage of cli
    Sentry.init({
      dsn:
        "https://3ed4eb43d28646e381bf3c50cff24bd6@o328029.ingest.sentry.io/5285892",
    });
    Sentry.configureScope((scope) => {
      if (auth.user) {
        scope.setUser({ email: auth.user });
      }
      scope.setExtra("cliVersion", getCliVersion());
      scope.setExtra("args", JSON.stringify(args));
      scope.setExtra("host", auth.host);
    });
  }

  /** PlasmicConfig **/
  let configFile =
    args.config || findConfigFile(process.cwd(), { traverseParents: true });

  if (!configFile) {
    await maybeRunPlasmicInit(args, "plasmic.json", enableSkipAuth);
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

  await resolveMissingFilesInConfig(context, config);
  removeMissingFilesFromLock(context, config, lock);

  return context;
}

/**
 * Use empty user/token to signify no auth (only returning to provide a default host).
 */
async function getCurrentOrDefaultAuth(args: CommonArgs) {
  const auth = await getCurrentAuth(args.auth);
  if (auth) {
    return auth;
  }

  return {
    host: DEFAULT_HOST,
    user: "",
    token: "",
  };
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
  throw new HandledError("Could not authenticate.");
}

async function maybeRunPlasmicInit(
  args: CommonArgs,
  missingFile: string,
  enableSkipAuth?: boolean
): Promise<boolean> {
  if (!process.env.QUIET) {
    logger.info(`No ${missingFile} file found. Initializing plasmic...`);
  }

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
    enableSkipAuth,
    ...args,
  });
  return true;
}

/**
 * Table of where this metadata will be set
 *
 * Source             | via       |
 * -------------------------------------------------------------------------
 * cli                | defaults  | source=cli    scheme=codegen command=sync|watch
 * loader             | defaults  | source=loader scheme=loader  command=sync|watch
 * create-plasmic-app | env       | source=create-plasmic-app
 * plasmic-action     | env       | source=plasmic-action
 */
export interface Metadata {
  platform?: string; // from plasmic.json
  source?: "cli" | "loader" | "create-plasmic-app" | "plasmic-action";
  scheme?: "codegen" | "loader";
  command?: "sync" | "watch";
}

/**
 * Create a metadata bundle
 * This will be used to tag Segment events (e.g. for codegen)
 * Merges in:
 * 1. defaults
 * 2. PLASMIC_METADATA environment variable settings
 * 3. arguments from the command-line
 * to create a single Metadata object for Segment
 * @param defaults
 * @param fromArgs
 */
export function generateMetadata(
  defaults: Metadata,
  fromArgs?: string
): Metadata {
  const fromEnv = process.env.PLASMIC_METADATA;
  const metadataFromEnv = !fromEnv ? {} : { ...querystring.decode(fromEnv) };
  const metadataFromArgs = !fromArgs ? {} : { ...querystring.decode(fromArgs) };
  // Priority: 1. args 2. env 3. defaults
  const metadata = L.assign({ ...defaults }, metadataFromEnv, metadataFromArgs);

  return metadata;
}

/**
 * This is meant to be called from consumers of the CLI to set
 * metadata into the PLASMIC_METADATA environment variable
 * @param metadata
 */
export function setMetadataEnv(metadata: Metadata): void {
  const fromEnv = process.env.PLASMIC_METADATA
    ? querystring.decode(process.env.PLASMIC_METADATA)
    : {};
  const env = { ...fromEnv };
  L.toPairs(metadata).forEach(([k, v]) => {
    if (!env[k]) {
      env[k] = v;
    }
  });
  process.env.PLASMIC_METADATA = querystring.encode(env);
}
