import * as Sentry from "@sentry/node";
import fs from "fs";
import inquirer from "inquirer";
import L from "lodash";
import os from "os";
import path from "upath";
import { DeepPartial } from "utility-types";
import { initPlasmic } from "../actions/init";
import { PlasmicApi } from "../api";
import { logger } from "../deps";
import { CommonArgs } from "../index";
import { runNecessaryMigrationsConfig } from "../migrations/migrations";
import { HandledError } from "../utils/error";
import {
  existsBuffered,
  findFile,
  readFileText,
  writeFileContentRaw,
} from "./file-utils";
import { getCliVersion } from "./npm-utils";

export const DEFAULT_HOST = "https://studio.plasmic.app";

// Default filenames
export const AUTH_FILE_NAME = ".plasmic.auth";
export const CONFIG_FILE_NAME = "plasmic.json";
export const LOCK_FILE_NAME = "plasmic.lock";

// Default environment variable names
export const ENV_AUTH_HOST = "PLASMIC_AUTH_HOST";
export const ENV_AUTH_USER = "PLASMIC_AUTH_USER";
export const ENV_AUTH_TOKEN = "PLASMIC_AUTH_TOKEN";

export interface PlasmicConfig {
  // Target platform to generate code for
  platform: "react";

  // The folder containing the source files; this is the default place where
  // all files are generated and dumped.
  srcDir: string;

  // The default folder where Plasmic-generated PP files will be dumped. Path
  // is relative to the srcDir.
  defaultPlasmicDir: string;

  // Config for code generation
  code: CodeConfig;

  // Config for pictures
  images: ImagesConfig;

  // Config for style generation
  style: StyleConfig;

  // Config for style tokens
  tokens: TokensConfig;

  // Configs for each global variant we have synced.
  globalVariants: GlobalVariantsConfig;
  projects: ProjectConfig[];

  // The version of cli when this file was written
  cliVersion?: string;

  postSyncCommands?: string[];
}

export interface CodeConfig {
  // Language to generate code in
  lang: "ts" | "js";

  // The default code generation scheme. Each component can override the scheme.
  scheme: "blackbox" | "direct";
}

export interface StyleConfig {
  // Styling framework to use
  scheme: "css" | "css-modules";

  defaultStyleCssFilePath: string;
}

export interface ImagesConfig {
  scheme: "inlined" | "files" | "public-files";
  publicDir?: string;
  publicUrlPrefix?: string;
}

export interface JsBundleThemeConfig {
  themeFilePath: string;
  bundleName: string;
}

export interface ProjectConfig {
  projectId: string;
  // Project name synced down from Studio
  projectName: string;
  // A version range that the user wants to sync without warnings
  version: string;
  cssFilePath: string;
  jsBundleThemes: JsBundleThemeConfig[];

  // Configs for each component we have synced.
  components: ComponentConfig[];
  // Configs for each icon we have synced.
  icons: IconConfig[];
  // Configs for each image we know about
  images: ImageConfig[];
}

export function createProjectConfig(base: {
  projectId: string;
  projectName: string;
  version: string;
  cssFilePath: string;
}): ProjectConfig {
  return {
    projectId: base.projectId,
    projectName: base.projectName,
    version: base.version,
    cssFilePath: base.cssFilePath,
    components: [],
    icons: [],
    images: [],
    jsBundleThemes: [],
  };
}

export interface TokensConfig {
  scheme: "theo";
  tokensFilePath: string;
}

/**
 * Describes how to import a Component
 */
export interface ImportSpec {
  // The import path to use to instantiate this Component.  The modulePath can be:
  // * An external npm module, like "antd/lib/button"
  // * An aliased path, like "@app/components/Button"
  // * A local file, like "components/Button.tsx" (path is relative to srcDir, and file
  //   extension is fully specified).  If local file is specified, then the module is imported
  //   via relative path.
  modulePath: string;

  // If the Component is a named export of the module, then this is the name.  If the Component
  // is the default export, then this is undefined.
  exportName?: string;
}

export interface ComponentConfig {
  id: string;
  name: string;
  type: "managed";
  projectId: string;

  // The file path for the blackbox render module, relative to srcDir.
  renderModuleFilePath: string;

  // The file path for the component css file, relative to srcDir.
  cssFilePath: string;

  // How to import this Component
  importSpec: ImportSpec;

  scheme: "blackbox" | "direct";
}

export interface IconConfig {
  id: string;
  name: string;
  moduleFilePath: string;
}

export interface ImageConfig {
  id: string;
  name: string;
  filePath: string;
}

export interface GlobalVariantsConfig {
  variantGroups: GlobalVariantGroupConfig[];
}

export interface GlobalVariantGroupConfig {
  id: string;
  name: string;
  projectId: string;
  contextFilePath: string;
}

export interface PlasmicLock {
  // One for each project that has been synced
  projects: ProjectLock[];

  // The version of CLI when this file was written
  cliVersion?: string;
}

function createPlasmicLock(): PlasmicLock {
  return {
    projects: [],
    cliVersion: getCliVersion(),
  };
}

export interface ProjectLock {
  projectId: string;
  // The exact version that was last synced
  version: string;
  dependencies: {
    // Maps from projectId => exact version
    [projectId: string]: string;
  };
}

/**
 * PlasmicContext is the PlasmicConfig plus context in which the PlasmicConfig was
 * created.
 */
export interface PlasmicContext {
  // Location of the plasmic.json file
  configFile: string;

  // Location of the plasmic.lock file
  lockFile: string;

  // Folder where plasmic.json file lives
  rootDir: string;

  // Absolute path to the source directory
  // If config.srcDir is a relative path, it will be relative to the Plasmic config file
  absoluteSrcDir: string;

  // The parsed PlasmicConfig
  config: PlasmicConfig;

  // The parsed PlasmicLock
  lock: PlasmicLock;

  // The parsed AuthConfig
  auth: AuthConfig;

  // Api instance to use for talking to Plasmic
  api: PlasmicApi;

  // args passed to cli
  cliArgs: any;
}

export interface AuthConfig {
  // Plasmic web app host
  host: string;

  // Plasmic user email
  user: string;

  // Plasmic API token
  token: string;

  // If Plasmic instance is gated by basic auth, the basic auth user and password
  basicAuthUser?: string;
  basicAuthPassword?: string;
}

export const DEFAULT_CONFIG: PlasmicConfig = {
  platform: "react",
  code: {
    lang: "ts",
    scheme: "blackbox",
  },
  style: {
    scheme: "css",
    // We set it to empty to compile. In reality, it will be provided the by
    // the server.
    defaultStyleCssFilePath: "",
  },
  images: {
    scheme: "inlined",
  },
  tokens: {
    scheme: "theo",
    tokensFilePath: "plasmic-tokens.theo.json",
  },
  srcDir: "./src/components",
  defaultPlasmicDir: "./plasmic",
  projects: [],
  globalVariants: {
    variantGroups: [],
  },
};

export const DEFAULT_PUBLIC_FILES_CONFIG: ImagesConfig = {
  scheme: "public-files",
  publicDir: "../public",
  publicUrlPrefix: "/public/",
};

/**
 * Finds the full path to the plasmic.json file in `dir`.  If
 * `opts.traverseParents` is set to true, then will also look in ancestor
 * directories until the plasmic.json file is found.  If none is found,
 * returns undefined.
 */
export function findConfigFile(
  dir: string,
  opts: {
    traverseParents?: boolean;
  }
): string | undefined {
  return findFile(dir, (f) => f === CONFIG_FILE_NAME, opts);
}

export function findAuthFile(
  dir: string,
  opts: {
    traverseParents?: boolean;
  }
) {
  let file = findFile(dir, (f) => f === AUTH_FILE_NAME, opts);
  if (!file) {
    file = findFile(os.homedir(), (f) => f === AUTH_FILE_NAME, {
      traverseParents: false,
    });
  }
  return file;
}

/**
 * Given some partial configs for PlasmicConfig, fills in all required fields
 * with default values.
 */
export function fillDefaults(
  config: DeepPartial<PlasmicConfig>
): PlasmicConfig {
  return L.merge({}, DEFAULT_CONFIG, config);
}

export async function getContext(args: CommonArgs): Promise<PlasmicContext> {
  /** PlasmicAuth */
  let authFilename =
    args.auth || findAuthFile(process.cwd(), { traverseParents: true });
  let authFromFile: AuthConfig | null = null;
  const authFromEnv = getEnvAuth();
  // If we're missing all auth options, run `plasmic init`
  if (!authFromEnv && !authFilename) {
    await maybeRunPlasmicInit(args, ".plasmic.auth");
    authFilename =
      args.auth || findAuthFile(process.cwd(), { traverseParents: true });
  }
  // Best effort try to get auth file
  if (authFilename) {
    authFromFile = readAuth(authFilename);
  }
  const auth = authFromEnv ?? authFromFile;
  if (!auth) {
    throw new HandledError(
      "No .plasmic.auth file found with Plasmic credentials. Please run `plasmic init` first."
    );
  }

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
  runNecessaryMigrationsConfig(configFile);
  const config = readConfig(configFile);
  const rootDir = path.dirname(configFile);

  /** PlasmicLock */
  // plasmic.lock should be in the same directory as plasmic.json
  const lockFile = path.join(rootDir, LOCK_FILE_NAME);
  const lock = readLock(lockFile);

  return {
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
}

export function readConfig(configFile: string): PlasmicConfig {
  if (!existsBuffered(configFile)) {
    const err = new HandledError(
      `No Plasmic config file found at ${configFile}`
    );
    throw err;
  }
  try {
    const result = JSON.parse(readFileText(configFile!)) as PlasmicConfig;
    return fillDefaults(result);
  } catch (e) {
    logger.error(
      `Error encountered reading ${CONFIG_FILE_NAME} at ${configFile}: ${e}`
    );
    throw e;
  }
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

export function readAuth(authFile: string) {
  if (!existsBuffered(authFile)) {
    const err = new HandledError(`No Plasmic auth file found at ${authFile}`);
    throw err;
  }
  try {
    const parsed = JSON.parse(readFileText(authFile)) as AuthConfig;
    // Strip trailing slashes.
    return {
      ...parsed,
      host: parsed.host.replace(/\/+$/, ""),
    };
  } catch (e) {
    logger.error(
      `Error encountered reading plasmic credentials at ${authFile}: ${e}`
    );
    throw e;
  }
}

export function getEnvAuth(): AuthConfig | undefined {
  const host = process.env[ENV_AUTH_HOST];
  const user = process.env[ENV_AUTH_USER];
  const token = process.env[ENV_AUTH_TOKEN];

  // both user and token are required
  if (!user || !token) {
    // Try to give a hint if they partially entered a credential
    if (user || token) {
      logger.warn(
        `Your Plasmic credentials were only partially set via environment variables. Try both ${ENV_AUTH_USER} and ${ENV_AUTH_TOKEN}`
      );
    }
    return;
  }

  return {
    host: host ?? DEFAULT_HOST,
    user,
    token,
  };
}

export function writeConfig(configFile: string, config: PlasmicConfig) {
  writeFileContentRaw(configFile, JSON.stringify(config, undefined, 2), {
    force: true,
  });
}

export function writeLock(lockFile: string, lock: PlasmicLock) {
  writeFileContentRaw(lockFile, JSON.stringify(lock, undefined, 2), {
    force: true,
  });
}

export function writeAuth(authFile: string, config: AuthConfig) {
  writeFileContentRaw(authFile, JSON.stringify(config, undefined, 2), {
    force: true,
  });
  fs.chmodSync(authFile, "600");
}

export function updateConfig(
  context: PlasmicContext,
  newConfig: PlasmicConfig
) {
  // plasmic.json
  writeConfig(context.configFile, newConfig);
  context.config = newConfig;

  // plasmic.lock
  writeLock(context.lockFile, context.lock);
}

export function getOrAddProjectConfig(
  context: PlasmicContext,
  projectId: string,
  base?: ProjectConfig // if one doesn't exist, start with this
): ProjectConfig {
  let project = context.config.projects.find((p) => p.projectId === projectId);
  if (!project) {
    project = !!base
      ? L.cloneDeep(base)
      : {
          projectId,
          projectName: "",
          version: "latest",
          cssFilePath: "",
          components: [],
          icons: [],
          images: [],
          jsBundleThemes: [],
        };
    context.config.projects.push(project);
  }
  return project;
}

export function getOrAddProjectLock(
  context: PlasmicContext,
  projectId: string,
  base?: ProjectLock // if one doesn't exist, start with this
): ProjectLock {
  let project = context.lock.projects.find((p) => p.projectId === projectId);
  if (!project) {
    project = !!base
      ? L.cloneDeep(base)
      : {
          projectId,
          version: "",
          dependencies: {},
        };
    context.lock.projects.push(project);
  }
  return project;
}

export async function maybeRunPlasmicInit(
  args: CommonArgs,
  missingFile: string
): Promise<void> {
  const runInit = await inquirer.prompt({
    name: "answer",
    message: `No ${missingFile} file found. Would you like to run \`plasmic init\`?`,
    type: "confirm",
  });

  if (runInit.answer) {
    await initPlasmic({
      host: DEFAULT_HOST,
      platform: "react",
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
  }
}
