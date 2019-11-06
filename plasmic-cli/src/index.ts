#!/usr/bin/env node
import yargs from "yargs";
import fs from "fs";
import path from "path";
import axios from "axios";
import { prependOnceListener } from "cluster";

yargs
  .usage('Usage: $0 <command> [options]')
  .command<InitArgs>(
    'init',
    'Initializes Plasmic for a project.',
    yags => yags
      .option('host', {
        alias: 'h',
        describe: 'Plasmic host to use',
        type: 'string'
      }),
    argv => initPlasmic(argv)
  )
  .command<SyncArgs>(
    'sync',
    'Syncs designs from Plasmic to local files',
    yags => {
      yags.option('projects', {
        alias: 'p',
        describe: 'ID of Plasmic projects to sync',
        type: 'array',
        demandOption: true,
      });
    },
    argv => {
      syncProjects(argv)
    }
  )
  .demandCommand()
  .help('h').alias('h', 'help')
  .argv;


interface CommonArgs {}

interface InitArgs extends CommonArgs {
  host: string;
}
function initPlasmic(opts: InitArgs) {
  const configFile = findConfigFile(process.cwd(), {traverseParents: false});
  if (configFile) {
    console.error("You already have a plasmic.json file!  Please either delete or edit it directly.")
    return;
  }

  fs.writeFileSync(path.join(process.cwd(), 'plasmic.json'), JSON.stringify(createInitConfig(opts), undefined, 2));
  console.log("Successfully created plasmic.json");
}

interface SyncArgs extends CommonArgs {
  projects: string[];
}
async function syncProjects(opts: SyncArgs) {
  console.log("Syncing...");
  const config = getConfig();
  const results = await Promise.all(opts.projects.map(project => axios.post(`${config.host}/api/v1/site/${project}/codegen/components`)));
  for (const result of results) {
    for (const bundle of result.data.results) {
      const {renderModule, skeletonModule, cssRules, renderModuleFileName, skeletonModuleFileName, cssFileName, componentName} = bundle;
      console.log(`Syncing component ${componentName}`);
      fs.writeFileSync(renderModuleFileName, renderModule);
      fs.writeFileSync(cssFileName, cssRules);
      if (fs.existsSync(skeletonModuleFileName)) {
        console.log(`\tSkipping ${skeletonModuleFileName} because it already exists.`);
      } else {
        fs.writeFileSync(skeletonModuleFileName, skeletonModule);
      }
    }
  }
}

function getConfig(): PlasmicConfig {
  const configFile = findConfigFile(process.cwd(), {traverseParents: true});
  if (!configFile) {
    console.error('No plasmic.json file found; please run `plasmic init` first.');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(configFile!).toString()) as PlasmicConfig;
  } catch (e) {
    console.error(`Error encountered reading plasmic.config at ${configFile}: ${e}`);
    process.exit(1);
  }
}

function findConfigFile(dir: string, opts: {
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

interface PlasmicConfig {
  host: string;
}

function createInitConfig(opts: InitArgs): PlasmicConfig {
  return {
    host: opts.host || "http://localhost:3003",
  };
}