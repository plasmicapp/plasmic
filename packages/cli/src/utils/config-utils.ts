import L from "lodash";
import { DeepPartial } from "utility-types";
import { PlasmicApi } from "../api";
import { logger } from "../deps";
import { HandledError } from "../utils/error";
import { formatAsLocal } from "./code-utils";
import {
  existsBuffered,
  findFile,
  readFileText,
  writeFileContentRaw,
} from "./file-utils";

export const DEFAULT_HOST =
  process.env.PLASMIC_DEFAULT_HOST || "https://studio.plasmic.app";

// Default filenames
export const AUTH_FILE_NAME = ".plasmic.auth";
export const CONFIG_FILE_NAME = "plasmic.json";
export const LOCK_FILE_NAME = "plasmic.lock";
export const CONFIG_SCHEMA_FILE_NAME = "plasmic.schema.json";

// Default environment variable names
export const ENV_AUTH_HOST = "PLASMIC_AUTH_HOST";
export const ENV_AUTH_USER = "PLASMIC_AUTH_USER";
export const ENV_AUTH_TOKEN = "PLASMIC_AUTH_TOKEN";

export interface PlasmicConfig {
  /** Target platform to generate code for */
  platform: "react" | "nextjs" | "gatsby" | "tanstack";

  /**
   * The folder containing the component source files; this is the default place where
   * all files are generated and stored.
   */
  srcDir: string;

  /**
   * The default folder where Plasmic-managed files will be stored. These include
   * blackbox component files, svg component files, style files, etc.  The path
   * is relative to the srcDir.
   */
  defaultPlasmicDir: string;

  /**
   * Next.js specific config
   */
  nextjsConfig?: {
    /** The folder containing page components source files. */
    pagesDir?: string;
  };

  /** Gatsby-specific config */
  gatsbyConfig?: {
    /** The folder containing page components source files. */
    pagesDir?: string;
  };

  /** Tanstack-specific config */
  tanstackConfig?: {
    /** The folder containing page components source files. */
    pagesDir?: string;
  };

  /** Config for code generation */
  code: CodeConfig;

  /** Config for pictures */
  images: ImagesConfig;

  /** Config for fonts import */
  fontOpts?: FontConfig;

  /** Config for style generation */
  style: StyleConfig;

  /** Config for style tokens */
  tokens: TokensConfig;

  /** Metadata for global variant groups */
  globalVariants: GlobalVariantsConfig;

  /** Metadata for each project that has been synced */
  projects: ProjectConfig[];

  /** Wether we should wrap the pages with the project global contexts or not */
  wrapPagesWithGlobalContexts: boolean;

  /** The version of cli when this file was written */
  cliVersion?: string;

  /** Configuration for localization */
  i18n?: I18NConfig;

  /** Arbitrary command to run after `plasmic sync` has run; useful for linting and code formatting synced files */
  postSyncCommands?: string[];

  /**
   * Package manager to use when installing or upgrading required
   * packages. If not specified, then it is best-effort automatically
   * derived.
   */
  packageManager?: "npm" | "yarn" | "yarn2" | "pnpm";
}

export interface CodeConfig {
  /** Language to generate code in */
  lang: "ts" | "js";

  /** The default code generation scheme. Each component can override the scheme. */
  scheme: "blackbox";

  reactRuntime: "classic" | "automatic";
}

export interface StyleConfig {
  /** Styling framework to use */
  scheme: "css" | "css-modules";

  /** File location for global css styles shared by all components. Relative to srcDir */
  defaultStyleCssFilePath: string;

  skipGlobalCssImport?: boolean;
}

export interface ImagesConfig {
  /**
   * How image files should be referenced from generated React components. The choices are:
   * * "files" - imported as relative files, like "import img from './image.png'". Not all bundlers support this.
   * * "public-files" - images are stored in a public folder, and referenced from some url prefix, like `<img src="/static/image.png"/>`.
   * * "inlined" - inlined directly into React files and css files as base64-encoded data-URIs.
   * * "cdn" - images are served from Plasmic's CDN.  Allows for dynamic resizing of images for
   *   serving the optimal file size given browser viewport.
   */
  scheme: "inlined" | "files" | "public-files" | "cdn";

  /**
   * The folder where "public" static files are stored. Plasmic-managed image files will be stored as "plasmic/project-name/image-name" under this folder.  Relative to srcDir; for example, "../public"
   */
  publicDir?: string;

  /**
   * The url prefix where "public" static files are stored.  For example, if publicDir is "public", publicUrlPrefix is "/static", then a file at public/test.png will be served at /static/test.png.
   */
  publicUrlPrefix?: string;
}

export interface JsBundleThemeConfig {
  themeFilePath: string;
  bundleName: string;
}

export interface CodeComponentConfig {
  id: string;
  name: string;
  displayName: string;
  componentImportPath: string;
  helper?: {
    name: string;
    importPath: string;
  };
}

export interface CustomFunctionConfig {
  id: string;
  name: string;
  namespace?: string | null;
  importPath: string;
  defaultExport: boolean;
}

export interface ProjectConfig {
  /** Project ID */
  projectId: string;
  /** Project API token. Grants read-only sync access to just this specific project and its dependencies. */
  projectApiToken?: string;
  /** Project name synced down from Studio */
  projectName: string;
  /** Project branch to be synced */
  projectBranchName?: string;
  /**
   * A version range for syncing this project. Can be:
   * * "latest" - always syncs down whatever has been saved in the project.
   * * ">0" - always syncs down the latest published version of the project.
   * * any other semver string you'd like
   */
  version: string;
  /** File location for the project-wide css styles. Relative to srcDir */
  cssFilePath: string;
  /** File location for the project-wide global contexts. Relative to srcDir */
  globalContextsFilePath: string;
  /** File location for the project-wide splits provider. Relative to srcDir */
  splitsProviderFilePath: string;

  // Code-component-related fields can be treated as optional not to be shown
  // to the users nor appear to be missing in the documentation.
  jsBundleThemes?: JsBundleThemeConfig[];
  codeComponents?: CodeComponentConfig[];
  customFunctions?: CustomFunctionConfig[];

  /** Metadata for each synced component in this project. */
  components: ComponentConfig[];
  /** Metadata for each synced icon in this project */
  icons: IconConfig[];
  /** Metadata for each synced image in this project */
  images: ImageConfig[];

  /**
   * True if the project was installed indirectly (as a dependency); if set,
   * codegen will not generate pages.
   */
  indirect: boolean;
}

export function createProjectConfig(base: {
  projectId: string;
  projectApiToken: string;
  projectName: string;
  version: string;
  cssFilePath: string;
  indirect: boolean;
}): ProjectConfig {
  return {
    projectId: base.projectId,
    projectApiToken: base.projectApiToken,
    projectName: base.projectName,
    // Indirect dependencies will have an explicit base.version but
    // we don't actually want to pin to that version in plasmic.json
    version: base.indirect ? ">0.0.0" : base.version,
    cssFilePath: base.cssFilePath,
    components: [],
    icons: [],
    images: [],
    indirect: base.indirect,
    globalContextsFilePath: "",
    splitsProviderFilePath: "",
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
  /**
   * The import path to use to instantiate this Component.  The modulePath can be:
   * * An external npm module, like "antd/lib/button"
   * * A local file, like "components/Button.tsx" (path is relative to srcDir, and file extension is fully specified).  If local file is specified, then the module is imported via relative path.
   *
   * For this to be an external npm module, the ComponentConfig.type must be "mapped".
   */
  modulePath: string;

  /**
   * If the Component is a named export of the module, then this is the name.  If the Component
   * is the default export, then this is undefined.
   */
  exportName?: string;
}

export interface ComponentConfig {
  /** Component ID */
  id: string;

  /** Javascript name of component */
  name: string;

  /** Plasmic project that this component belongs in */
  projectId: string;

  /** Whether this component is managed by Plasmic -- with Plasmic* files generated -- or mapped to an external library */
  type: "managed" | "mapped";

  /** How to import this Component from another component file */
  importSpec: ImportSpec;

  /** The file path for the blackbox render module, relative to srcDir. */
  renderModuleFilePath: string;

  /** The file path for the component css file, relative to srcDir. */
  cssFilePath: string;

  /** Code generation scheme used for this component */
  scheme: "blackbox" | "direct";

  componentType: "page" | "component";

  /** Page path if the component is a page */
  path?: string;

  /** Plume type if component is a Plume component */
  plumeType?: string;

  /**
   * RSC metadata for this component. The structure of the config changes when this is set:
   * renderModuleFilePath points to the client blackbox render module.
   * importSpec points to the server skeleton file.
   */
  rsc?: {
    /** The server blackbox render module  */
    serverModulePath: string;
    /** The client skeleton file */
    clientModulePath: string;
  };
}

export interface IconConfig {
  /** ID of icon */
  id: string;

  /** Javascript name of the React component for this icon */
  name: string;

  /** The file path for the React component file for this icon, relative to srcDir. */
  moduleFilePath: string;
}

export interface ImageConfig {
  /** ID of image */
  id: string;
  /** name of image */
  name: string;
  /** File path for the image file, relative to srcDir */
  filePath: string;
}

export interface FontConfig {
  /**  "import" generates `@import url(...)`
   *
   * "none" doesn't generate anything; you need to load the font yourself.
   */
  scheme: "import" | "none";
}

export interface GlobalVariantsConfig {
  variantGroups: GlobalVariantGroupConfig[];
}

export interface GlobalVariantGroupConfig {
  /** ID of the global variant group */
  id: string;
  /** Javascript name of the global variant group */
  name: string;
  /** Plasmic project this global variant group belongs to */
  projectId: string;
  /** File path for the global variant group React context definition, relative to srcDir */
  contextFilePath: string;
}

export interface FileLock {
  // The type of file whose checksum was computed
  type:
    | "renderModule"
    | "cssRules"
    | "icon"
    | "image"
    | "projectCss"
    | "globalVariant"
    | "globalContexts"
    | "splitsProvider";
  // The checksum value for the file
  checksum: string;
  // The component id, or the image asset id
  assetId: string;
}

export interface ProjectLock {
  projectId: string;
  branchName: string;
  // The exact version that was last synced
  version: string;
  dependencies: {
    // Maps from projectId => exact version
    [projectId: string]: string;
  };
  // The language during last sync
  lang: "ts" | "js";
  // One for each file whose checksum is computed
  fileLocks: FileLock[];
  // The version of Codegen when this project was written
  codegenVersion?: string;
}

export interface I18NConfig {
  /**
   * For localization, whether the extracted strings are keyed by its content,
   * or by a hash of its content, or by where the string is found ("path")
   */
  keyScheme: "content" | "hash" | "path";
  /**
   * For localization, rich text with embedded tags are exported as
   * "Hello <0>there</0>, I am <1>here</1>".  Some frameworks, like
   * react-intl, doesn't work with numbers as tag names, so you can
   * specify a prefix. For example, a tagPrefix of "n" turns the above
   * into "Hello <n0>there</n0>, I am <n1>here</n1>".
   */
  tagPrefix?: string;
}

export interface PlasmicLock {
  // One for each project that has been synced
  projects: ProjectLock[];

  // The version of CLI when this file was written
  cliVersion?: string;
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
    reactRuntime: "classic",
  },
  style: {
    scheme: "css-modules",
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
  wrapPagesWithGlobalContexts: true,
};

export const DEFAULT_PUBLIC_FILES_CONFIG: ImagesConfig = {
  scheme: "public-files",
  publicDir: "../public",
  publicUrlPrefix: "/static/",
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

/**
 * Given some partial configs for PlasmicConfig, fills in all required fields
 * with default values.
 */
export function fillDefaults(
  config: DeepPartial<PlasmicConfig>
): PlasmicConfig {
  return L.merge({}, DEFAULT_CONFIG, config);
}

export function readConfig(
  configFile: string,
  autoFillDefaults: boolean
): PlasmicConfig {
  if (!existsBuffered(configFile)) {
    const err = new HandledError(
      `No Plasmic config file found at ${configFile}`
    );
    throw err;
  }
  try {
    const result = JSON.parse(readFileText(configFile!)) as PlasmicConfig;
    return autoFillDefaults ? fillDefaults(result) : result;
  } catch (e) {
    logger.error(
      `Error encountered reading ${CONFIG_FILE_NAME} at ${configFile}: ${e}`
    );
    throw e;
  }
}

export async function writeConfig(
  configFile: string,
  config: PlasmicConfig,
  baseDir: string
) {
  await writeFileContentRaw(
    configFile,
    formatAsLocal(
      JSON.stringify(
        {
          ...config,
          $schema: `https://unpkg.com/@plasmicapp/cli@${config.cliVersion}/dist/plasmic.schema.json`,
        },
        undefined,
        2
      ),
      configFile,
      baseDir
    ),
    {
      force: true,
    }
  );
}

export async function writeLock(
  lockFile: string,
  lock: PlasmicLock,
  baseDir: string
) {
  await writeFileContentRaw(
    lockFile,
    formatAsLocal(JSON.stringify(lock, undefined, 2), "/tmp/x.json", baseDir),
    {
      force: true,
    }
  );
}

export async function updateConfig(
  context: PlasmicContext,
  newConfig: PlasmicConfig,
  baseDir: string
) {
  // plasmic.json
  await writeConfig(context.configFile, newConfig, baseDir);
  context.config = newConfig;

  // plasmic.lock
  await writeLock(context.lockFile, context.lock, baseDir);
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
          indirect: false,
          globalContextsFilePath: "",
          splitsProviderFilePath: "",
        };
    context.config.projects.push(project);
  }
  return project;
}

export function getOrAddProjectLock(
  context: PlasmicContext,
  projectId: string,
  branchName: string,
  base?: ProjectLock // if one doesn't exist, start with this
): ProjectLock {
  let project = context.lock.projects.find((p) => p.projectId === projectId);
  if (!project) {
    project = !!base
      ? L.cloneDeep(base)
      : {
          projectId,
          branchName,
          version: "",
          dependencies: {},
          lang: context.config.code.lang,
          fileLocks: [],
        };
    context.lock.projects.push(project);
  }
  return project;
}

export function isPageAwarePlatform(platform: string): boolean {
  return (
    platform === "nextjs" || platform === "gatsby" || platform === "tanstack"
  );
}
