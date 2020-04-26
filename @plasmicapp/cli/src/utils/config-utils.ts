import fs from "fs";
import path from "path";
import os from "os";
import L from "lodash";
import { writeFileContentRaw, findFile } from "./file-utils";
import { PlasmicApi } from "../api";
import { CommonArgs } from "../index";
import { DeepPartial } from "utility-types";

export const AUTH_FILE_NAME = ".plasmic.auth";
export const CONFIG_FILE_NAME = "plasmic.json";

export interface PlasmicConfig {
  // Target platform to generate code for
  platform: "react";

  // The folder containing the source files; this is the default place where
  // all files are generated and dumped.
  srcDir: string;

  // Config for code generation
  code: CodeConfig;

  // Config for style generation
  style: StyleConfig;

  // Config for style tokens
  tokens: TokensConfig;

  // Configs for each global variant we have synced.
  globalVariants: GlobalVariantsConfig;
  projects: ProjectConfig[];
}

export interface CodeConfig {
  // Language to generate code in
  lang: "ts";

  // Code generation scheme
  scheme: "blackbox";
}

export interface StyleConfig {
  // Styling framework to use
  scheme: "css";
}

export interface ProjectConfig {
  projectId: string;
  fontsFilePath: string;

  // Configs for each component we have synced.
  components: ComponentConfig[];
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

/**
 * PlasmicContext is the PlasmicConfig plus context in which the PlasmicConfig was
 * created.
 */
export interface PlasmicContext {
  // Location of the plasmic.json file
  configFile: string;

  // Folder where plasmic.json file lives
  rootDir: string;

  // The parsed PlasmicConfig
  config: PlasmicConfig;

  // The parsed AuthConfig
  auth: AuthConfig;

  // Api instance to use for talking to Plasmic
  api: PlasmicApi;
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
    scheme: "blackbox"
  },
  style: {
    scheme: "css"
  },
  tokens: {
    scheme: "theo",
    tokensFilePath: "plasmic-tokens.theo.json"
  },
  srcDir: ".",
  projects: [],
  globalVariants: {
    variantGroups: []
  }
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
  return findFile(dir, f => f === CONFIG_FILE_NAME, opts);
}

export function findAuthFile(
  dir: string,
  opts: {
    traverseParents?: boolean;
  }
) {
  let file = findFile(dir, f => f === AUTH_FILE_NAME, opts);
  if (!file) {
    file = findFile(os.homedir(), f => f === AUTH_FILE_NAME, {
      traverseParents: false
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

export function getContext(args: CommonArgs): PlasmicContext {
  const configFile =
    args.config || findConfigFile(process.cwd(), { traverseParents: true });
  if (!configFile) {
    console.error(
      "No plasmic.json file found; please run `plasmic init` first."
    );
    process.exit(1);
  }
  const authFile =
    args.auth || findAuthFile(process.cwd(), { traverseParents: true });
  if (!authFile) {
    console.log(
      "No .plasmic.auth file found with Plasmic credentials; please run `plasmic init` first."
    );
    process.exit(1);
  }
  const auth = readAuth(authFile);
  return {
    config: readConfig(configFile),
    configFile,
    rootDir: path.dirname(configFile),
    auth,
    api: new PlasmicApi(auth)
  };
}

export function readConfig(configFile: string) {
  if (!fs.existsSync(configFile)) {
    console.error(`No Plasmic config file found at ${configFile}`);
    process.exit(1);
  }
  try {
    const result = JSON.parse(
      fs.readFileSync(configFile!).toString()
    ) as PlasmicConfig;
    return fillDefaults(result);
  } catch (e) {
    console.error(
      `Error encountered reading plasmic.config at ${configFile}: ${e}`
    );
    process.exit(1);
  }
}

export function readAuth(authFile: string) {
  if (!fs.existsSync(authFile)) {
    console.error(`No Plasmic auth file found at ${authFile}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(authFile).toString()) as AuthConfig;
  } catch (e) {
    console.error(
      `Error encountered reading plasmic credentials at ${authFile}: ${e}`
    );
    process.exit(1);
  }
}

export function writeConfig(configFile: string, config: PlasmicConfig) {
  writeFileContentRaw(configFile, JSON.stringify(config, undefined, 2), {
    force: true
  });
}

export function writeAuth(authFile: string, config: AuthConfig) {
  writeFileContentRaw(authFile, JSON.stringify(config, undefined, 2), {
    force: true
  });
  fs.chmodSync(authFile, "600");
}

export function updateConfig(
  context: PlasmicContext,
  updates: DeepPartial<PlasmicConfig>
) {
  let config = readConfig(context.configFile);
  L.merge(config, updates);
  writeConfig(context.configFile, config);
  context.config = config;
}
