#!/usr/bin/env node
import yargs from "yargs";
import fs from "fs";
import path from "path";
import axios, { AxiosResponse } from "axios";
import L from "lodash";
import { stripExtension, writeFileContent } from "./file-utils";
import {PlasmicConfig, DEFAULT_CONFIG, findConfigFile, fillDefaults, readConfig, writeConfig, getContext, updateConfig, ComponentConfig, PlasmicContext} from "./config-utils";
import glob from "glob";
import { replaceImports, isLocalImportPath, parseImportPath } from "./code-utils";

yargs
  .usage('Usage: $0 <command> [options]')
  .command<InitArgs>(
    'init',
    'Initializes Plasmic for a project.',
    yags => yags
      .option('host', {
        describe: 'Plasmic host to use',
        type: 'string',
        default: DEFAULT_CONFIG.host,
      })
      .option("platform", {
        describe: "Target platform to generate code for",
        choices: ["react"],
        default: DEFAULT_CONFIG.platform,
      })
      .option("lang", {
        describe: "Target language to generate code for",
        choices: ["ts"],
        default: DEFAULT_CONFIG.lang,
      })
      .option("scheme", {
        describe: "Code generation scheme to use",
        choices: ["blackbox"],
        default: DEFAULT_CONFIG.scheme,
      })
      .option("src-dir", {
        describe: "Folder where component source files live",
        type: "string",
        default: DEFAULT_CONFIG.srcDir,
      })
      .option("style", {
        describe: "Styling framework to use",
        choices: ["css"],
        default: DEFAULT_CONFIG.style,
      }),
    argv => initPlasmic(argv)
  )
  .command<SyncArgs>(
    'sync',
    'Syncs designs from Plasmic to local files.',
    yags => yags
      .option('projects', {
        alias: 'p',
        describe: 'ID of Plasmic projects to sync.  If not specified, defaults to all known projects.',
        type: 'array',
        default: [],
      })
      .option('components', {
        alias: 'c',
        describe: 'Names or IDs of components to sync.  If not specified, defaults to all known components of existing projects, or all components of new projects.',
        type: "array",
        default: [],
      }),
    argv => {
      syncProjects(argv)
    }
  )
  .command<FixImportsArgs>(
    'fix-imports',
    "Fixes import paths after you've moved around Plasmic blackbox files",
    yags => 0,
    argv => fixImports(argv)
  )
  .demandCommand()
  .help('h').alias('h', 'help')
  .argv;


interface CommonArgs {}

interface InitArgs extends CommonArgs {
  host: string;
  platform: "react",
  lang: "ts",
  scheme: "blackbox",
  style: "css",
  srcDir: string;
}
function initPlasmic(opts: InitArgs) {
  const configFile = findConfigFile(process.cwd(), {traverseParents: false});
  if (configFile) {
    console.error("You already have a plasmic.json file!  Please either delete or edit it directly.")
    return;
  }
  writeConfig(path.join(process.cwd(), 'plasmic.json'), createInitConfig(opts));
  console.log("Successfully created plasmic.json");
}

interface SyncArgs extends CommonArgs {
  projects: readonly string[];
  components: readonly string[];
}
async function syncProjects(opts: SyncArgs) {
  const context = getContext();
  const config = context.config;
  const srcDir = path.join(context.rootDir, config.srcDir);
  const projectIds = opts.projects.length > 0 ? opts.projects : config.components.map(c => c.projectId);
  if (projectIds.length === 0) {
    console.error("Don't know which projects to sync; please specify via --projects");
    process.exit(1);
  }

  // `components` is a list of component names or IDs
  const components = opts.components.length > 0 ? opts.components : config.components.map(c => c.id);
  const shouldSyncComponents = (id: string, name: string) => {
    if (components.length === 0) {
      return true;
    }
    return components.includes(id) || components.includes(name);
  }

  const allCompConfigs = L.keyBy(config.components, c => c.id);
  const baseNameToFiles = buildBaseNameToFiles(context);

  const results = await Promise.all(projectIds.map(projectId => axios.post(`${config.host}/api/v1/site/${projectId}/codegen/components`)));
  for (const [projectId, result] of L.zip(projectIds, results) as [string, AxiosResponse<any>][]) {
    for (const bundle of result.data.results) {
      const {renderModule, skeletonModule, cssRules, renderModuleFileName, skeletonModuleFileName, cssFileName, componentName, id} = bundle;
      if (!shouldSyncComponents(id, componentName)) {
        continue;
      }
      console.log(`Syncing component ${componentName} [${projectId}/${id}]`);
      const compConfig = allCompConfigs[id];
      if (!compConfig) {
        // This is the first time we're syncing this component
        allCompConfigs[id] = {
          id,
          name: componentName,
          type: "managed",
          projectId: projectId,
          renderModuleFilePath: renderModuleFileName,
          importPath: skeletonModuleFileName,
          cssFilePath: cssFileName,
        };
        writeFileContent(path.join(srcDir, renderModuleFileName), renderModule, {force: false});
        writeFileContent(path.join(srcDir, cssFileName), cssRules, {force: false});

        // Because it's the first time, we also generate the skeleton file.
        writeFileContent(path.join(srcDir, skeletonModuleFileName), skeletonModule, {force: false});
        config.components.push(allCompConfigs[id]);
      } else {
        // This is an existing component. We first make sure the files are all in the expected
        // places, and then overwrite them with the new content
        fixComponentPaths(srcDir, compConfig, baseNameToFiles);
        writeFileContent(path.join(srcDir, compConfig.renderModuleFilePath), renderModule, {force: true});
        writeFileContent(path.join(srcDir, compConfig.cssFilePath), cssRules, {force: true});
      }
    }
  }

  // Write the new ComponentConfigs to disk
  updateConfig(context, {components: config.components});

  // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
  fixAllImportStatements(context);
}

interface FixImportsArgs extends CommonArgs {}
function fixImports(opts: FixImportsArgs) {
  const context = getContext();
  const config = context.config;
  const srcDir = path.join(context.rootDir, config.srcDir);
  const baseNameToFiles = buildBaseNameToFiles(context);
  for (const compConfig of config.components) {
    fixComponentPaths(srcDir, compConfig, baseNameToFiles);
  }

  updateConfig(context, {components: config.components});
  fixAllImportStatements(context);
}

/**
 * Attempts to look for all files referenced in `compConfig`, and best-guess fix up the references
 * if the files have been moved.  Mutates `compConfig` with the new paths.
 */
function fixComponentPaths(srcDir: string, compConfig: ComponentConfig, baseNameToFiles: Record<string, string[]>) {
  const newRenderModuleFilePath = findSrcDirPath(srcDir, compConfig.renderModuleFilePath, baseNameToFiles);
  if (newRenderModuleFilePath !== compConfig.renderModuleFilePath) {
    console.warn(`\tDetected file moved from ${compConfig.renderModuleFilePath} to ${newRenderModuleFilePath}`);
    compConfig.renderModuleFilePath = newRenderModuleFilePath;
  }

  const newCssFilePath = findSrcDirPath(srcDir, compConfig.cssFilePath, baseNameToFiles);
  if (newCssFilePath !== compConfig.cssFilePath) {
    console.warn(`\tDetected file moved from ${compConfig.cssFilePath} to ${newCssFilePath}`);
    compConfig.cssFilePath = newCssFilePath;
  }

  // If `compConfig.importPath` is still referencing a local file, then we can also best-effort detect
  // whether it has been moved.
  if (isLocalImportPath(compConfig.importPath)) {
    const {modulePath, exportName} = parseImportPath(compConfig.importPath);
    const fuzzyPath = findSrcDirPath(srcDir, modulePath, baseNameToFiles);
    if (fuzzyPath !== modulePath) {
      console.warn(`\tDetected file moved from ${modulePath} to ${fuzzyPath}`);
      compConfig.importPath = `${fuzzyPath}` + (exportName ? `::${exportName}` : "");
    }
  }
}

/**
 * Tries to find the file at `srcDir/expectedPath`.  If it's not there, tries to detect if it has
 * been moved to a different location.  Returns the found location relative to the `srcDir`.
 *
 * If `expectedPath` doesn't exist, but there's more than one file of that name in `baseNameToFiles`, then
 * error and quit.  If no file of that name can be found, `expectedPath` is returned.
 */
function findSrcDirPath(srcDir: string, expectedPath: string, baseNameToFiles: Record<string, string[]>): string {
  const fileName = path.basename(expectedPath);
  if (fs.existsSync(path.join(srcDir, expectedPath))) {
    return expectedPath;
  } else if (!(fileName in baseNameToFiles)) {
    return expectedPath;
  } else if (baseNameToFiles[fileName].length === 1) {
    // There's only one file of the same name, so maybe we've been moved there?
    const newPath = baseNameToFiles[fileName][0];
    return path.relative(srcDir, newPath);
  } else {
    console.error(`Cannot find expected file at ${expectedPath}, and found multiple possible matching files ${baseNameToFiles[fileName]}.  Please update plasmic.config with the real location for ${fileName}.`);
    process.exit(1);
  }
}

/**
 * Assuming that all the files referenced in PlasmicConfig are correct, fixes import statements using PlasmicConfig
 * file locations as the source of truth.
 */
function fixAllImportStatements(context: PlasmicContext) {
  const config = context.config;
  const srcDir = path.join(context.rootDir, config.srcDir);
  const allCompConfigs = L.keyBy(config.components, c => c.id);
  for (const compConfig of config.components) {
    fixComponentImportStatements(srcDir, compConfig, allCompConfigs);
  }
}

function fixComponentImportStatements(srcDir: string, compConfig: ComponentConfig, allCompConfigs: Record<string, ComponentConfig>) {
  fixFileImportStatements(srcDir, compConfig.renderModuleFilePath, allCompConfigs);
  fixFileImportStatements(srcDir, compConfig.cssFilePath, allCompConfigs);
  // If ComponentConfig.importPath is still a local file, we best-effort also fix up the import statements there.
  if (isLocalImportPath(compConfig.importPath)) {
    const {modulePath} = parseImportPath(compConfig.importPath);
    fixFileImportStatements(srcDir, modulePath, allCompConfigs);
  }
}

function fixFileImportStatements(srcDir: string, srcDirFilePath: string, allCompConfigs: Record<string, ComponentConfig>) {
  const prevContent = fs.readFileSync(path.join(srcDir, srcDirFilePath)).toString();
  const newContent = replaceImports(prevContent, srcDirFilePath, allCompConfigs);
  writeFileContent(path.join(srcDir, srcDirFilePath), newContent, {force: true});
}


function createInitConfig(opts: InitArgs): PlasmicConfig {
  return fillDefaults({
    host: opts.host,
    srcDir: opts.srcDir,
    scheme: opts.scheme,
    style: opts.style,
    lang: opts.lang,
    platform: opts.platform,
  });
}


function buildBaseNameToFiles(context: PlasmicContext) {
  const srcDir = path.join(context.rootDir, context.config.srcDir);
  const allFiles = glob.sync(`${srcDir}/**/*.+(ts|css|tsx)`, {
    ignore: [`${srcDir}/**/node_modules/**/*`],
  });
  return L.groupBy(allFiles, f => path.basename(f));
}