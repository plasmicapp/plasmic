#!/usr/bin/env node
import yargs from "yargs";
import { fixImports, FixImportsArgs } from "./actions/fix-imports";
import { InitArgs, initPlasmic } from "./actions/init";
import { SyncArgs, syncProjects } from "./actions/sync";
import { WatchArgs, watchProjects } from "./actions/watch";
import { SyncStyleTokensArgs, syncStyleTokens } from "./actions/sync-styles";
import { DEFAULT_CONFIG } from "./utils/config-utils";
import { syncIcons, SyncIconsArgs } from "./actions/sync-icons";

if (process.env.DEBUG_CHDIR) {
  process.chdir(process.env.DEBUG_CHDIR);
}

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
    yags => {
      yags
        .option("host", {
          describe: "Plasmic host to use",
          type: "string",
          default: "https://studio.plasmic.app"
        })
        .option("platform", {
          describe: "Target platform to generate code for",
          choices: ["react"],
          default: DEFAULT_CONFIG.platform
        })
        .option("code-lang", {
          describe: "Target language to generate code for",
          choices: ["", "js", "ts"],
          default: ""
        })
        .option("code-scheme", {
          describe: "Code generation scheme to use",
          choices: ["blackbox"],
          default: DEFAULT_CONFIG.code.scheme
        })
        .option("src-dir", {
          describe:
            "Default directory to put React component files (that you edit) into",
          type: "string",
          default: ""
        })
        .option("plasmic-dir", {
          describe:
            "Default directory to put Plasmic-managed files into; relative to src-dir",
          type: "string",
          default: ""
        })
        .option("style-scheme", {
          describe: "Styling framework to use",
          choices: ["css"],
          default: DEFAULT_CONFIG.style.scheme
        });
    },
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
  .command<SyncStyleTokensArgs>(
    "sync-style-tokens",
    "Syncs style tokens",
    yags =>
      yags.option("projects", {
        alias: "p",
        describe:
          "ID of Plasmic projects to sync.  If not specifed, defaults to all known projects.",
        type: "array",
        default: []
      }),
    argv => syncStyleTokens(argv)
  )
  .command<SyncIconsArgs>(
    "sync-icons",
    "Syncs icon assets",
    yags =>
      yags.option("projects", {
        alias: "p",
        describe:
          "ID of Plasmic projects to sync.  If not specifed, defaults to all known projects.",
        type: "array",
        default: []
      }),
    argv => syncIcons(argv)
  )
  .command<FixImportsArgs>(
    "fix-imports",
    "Fixes import paths after you've moved around Plasmic blackbox files",
    yags => 0,
    argv => fixImports(argv)
  )
  .demandCommand()
  .strict()
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
    .option("only-existing", {
      type: "boolean",
      describe:
        "If no --components are explicitly specified, then only syncs components that had been synced before.",
      default: false
    })
    .option("force-overwrite", {
      type: "boolean",
      describe:
        "Overwrite the skeleton file with newly generated version. Useful when switching between codegen schemes.",
      default: false
    })
    .option("append-jsx-on-missing-base", {
      type: "boolean",
      describe:
        "When the base metadata is missing to perform the three-way merge for direct edit component, append the jsx of the new version so that user can perform manual merge.",
      default: false
    })
    .option("new-component-scheme", {
      type: "string",
      choices: ["blackbox", "direct"],
      describe:
        "Sync the new components using this code scheme rather than the default code scheme."
    });
}

export interface CommonArgs {
  auth?: string;
  config?: string;
}
