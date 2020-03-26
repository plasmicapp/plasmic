#!/usr/bin/env node
import yargs from "yargs";
import { fixImports, FixImportsArgs } from "./actions/fix-imports";
import { InitArgs, initPlasmic } from "./actions/init";
import { SyncArgs, syncProjects } from "./actions/sync";
import { WatchArgs, watchProjects } from "./actions/watch";
import { DEFAULT_CONFIG } from "./utils/config-utils";

yargs
  .usage("Usage: $0 <command> [options]")
  .option("auth", {
    describe:
      "Plasmic auth file to use; by default, uses ~/.plasmic.auth, or the first .plasmic.auth file found in current and parent directories"
  })
  .option("config", {
    describe:
      "Plasmic config file to use; by default, uses the first plasmic.json file found in the current or parent directories"
  })
  .command<InitArgs>(
    "init",
    "Initializes Plasmic for a project.",
    yags =>
      yags
        .option("host", {
          describe: "Plasmic host to use",
          type: "string",
          default: "https://prod.plasmic.app"
        })
        .option("platform", {
          describe: "Target platform to generate code for",
          choices: ["react"],
          default: DEFAULT_CONFIG.platform
        })
        .option("code-lang", {
          describe: "Target language to generate code for",
          choices: ["ts"],
          default: DEFAULT_CONFIG.code.lang
        })
        .option("code-scheme", {
          describe: "Code generation scheme to use",
          choices: ["blackbox"],
          default: DEFAULT_CONFIG.code.scheme
        })
        .option("src-dir", {
          describe: "Folder where component source files live",
          type: "string",
          default: DEFAULT_CONFIG.srcDir
        })
        .option("style-scheme", {
          describe: "Styling framework to use",
          choices: ["css"],
          default: DEFAULT_CONFIG.style.scheme
        }),
    argv => initPlasmic(argv)
  )
  .command<SyncArgs>(
    "sync",
    "Syncs designs from Plasmic to local files.",
    yags => configureSyncArgs(yags),
    argv => {
      syncProjects(argv);
    }
  )
  .command<WatchArgs>(
    "watch",
    "Watches for updates to projects, and syncs them automatically to local files.",
    yags => configureSyncArgs(yags),
    argv => {
      watchProjects(argv);
    }
  )
  .command<FixImportsArgs>(
    "fix-imports",
    "Fixes import paths after you've moved around Plasmic blackbox files",
    yags => 0,
    argv => fixImports(argv)
  )
  .demandCommand()
  .help("h")
  .alias("h", "help").argv;

function configureSyncArgs(yags: yargs.Argv) {
  return yags
    .option("projects", {
      alias: "p",
      describe:
        "ID of Plasmic projects to sync.  If not specified, defaults to all known projects.",
      type: "array",
      default: []
    })
    .option("components", {
      alias: "c",
      describe:
        "Names or IDs of components to sync.  If not specified, defaults to all known components of existing projects, or all components of new projects.",
      type: "array",
      default: []
    })
    .option("include-new", {
      type: "boolean",
      describe:
        "If no --components are explicitly specified, then also export new components",
      default: false
    });
}

export interface CommonArgs {
  auth?: string;
  config?: string;
}
