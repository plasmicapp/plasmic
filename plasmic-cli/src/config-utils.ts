import fs from "fs";
import path from "path";
import L from "lodash";
import { writeFileContent } from "./file-utils";

export interface PlasmicConfig {
  // Plasmic web app host
  host: string;

  // Target platform to generate code for
  platform: "react";

  // Language to generate code in
  lang: "ts";

  // Code generation scheme
  scheme: "blackbox";

  // Styling framework to use
  style: "css";

  // The folder containing the source files; this is the default place where
  // generated code is dumped and found.
  srcDir: string;

  // Configs for each component we have synced.
  components: ComponentConfig[];
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

  // The import path to use to instantiate this Component.  The import path can be:
  // * An external npm module, like "antd/lib/button"
  // * An aliased path, like "@app/components/Button"
  // * A local file, like "components/Button.tsx" (path is relative to srcDir, and file
  //   extension is fully specified).  If local file is specified, then the module is imported
  //   via relative path.
  //
  // If the actual Component is the default export, then just the import path is
  // sufficient.  If the Component is a named export of the module, then you can specify
  // the name after the path, followed by "::".
  //
  // Here are some valid importPaths:
  //   antd/lib/button
  //   antd::Button
  //   @app/components/Button
  //   src/components/Button.tsx
  //   src/components/Button.tsx::PrimaryButton
  importPath: string;
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
}

export const DEFAULT_CONFIG: PlasmicConfig = {
  host: "http://localhost:3003",
  platform: "react",
  lang: "ts",
  scheme: "blackbox",
  style: "css",
  srcDir: ".",
  components: []
};

/**
 * Finds the full path to the plasmic.json file in `dir`.  If
 * `opts.traverseParents` is set to true, then will also look in ancestor
 * directories until the plasmic.json file is found.  If none is found,
 * returns undefined.
 */
export function findConfigFile(dir: string, opts: {
  traverseParents?: boolean
}): string|undefined {
  const files = fs.readdirSync(dir);
  const config = files.find(f => f === "plasmic.json");
  if (config) {
    return path.join(dir, config);
  }
  if (dir === '/' || !opts.traverseParents) {
    return undefined;
  }
  return findConfigFile(path.dirname(dir), opts);
}

/**
 * Given some partial configs for PlasmicConfig, fills in all required fields
 * with default values.
 */
export function fillDefaults(config: Partial<PlasmicConfig>): PlasmicConfig {
  return L.defaults(config, DEFAULT_CONFIG);
}

export function getContext(): PlasmicContext {
  const configFile = findConfigFile(process.cwd(), {traverseParents: true});
  if (!configFile) {
    console.error('No plasmic.json file found; please run `plasmic init` first.');
    process.exit(1);
  }
  return {
    config: readConfig(configFile),
    configFile,
    rootDir: path.dirname(configFile)
  };
}

export function readConfig(configFile: string) {
  try {
    const result = JSON.parse(fs.readFileSync(configFile!).toString()) as PlasmicConfig;
    return fillDefaults(result);
  } catch (e) {
    console.error(`Error encountered reading plasmic.config at ${configFile}: ${e}`);
    process.exit(1);
  }
}

export function writeConfig(configFile: string, config: PlasmicConfig) {
  writeFileContent(configFile, JSON.stringify(config, undefined, 2), {force: true});
}

export function updateConfig(context: PlasmicContext, updates: Partial<PlasmicConfig>) {
  let config = readConfig(context.configFile);
  config = {...config, ...updates};
  writeConfig(context.configFile, config);
}