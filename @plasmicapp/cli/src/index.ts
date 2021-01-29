#!/usr/bin/env node
import semver from "semver";
import updateNotifier from "update-notifier";
import yargs from "yargs";
import * as auth from "./actions/auth";
import { fixImports, FixImportsArgs } from "./actions/fix-imports";
import { InitArgs, initPlasmic } from "./actions/init";
import { sync, SyncArgs } from "./actions/sync";
import { UploadBundleArgs, uploadJsBundle } from "./actions/upload-bundle";
import { WatchArgs, watchProjects } from "./actions/watch";
import { logger } from "./deps";
import { HandledError } from "./utils/error";

if (process.env.DEBUG_CHDIR) {
  process.chdir(process.env.DEBUG_CHDIR);
}

const handleError = <T>(p: Promise<T>) => {
  return p.catch((e) => {
    if (e instanceof HandledError) {
      logger.error(e.message);
    } else {
      throw e;
    }
  });
};

const pkg = require("../package.json");
// Check once an hour
const notifier = updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 });
// Workaround for this bug
// https://github.com/yeoman/update-notifier/issues/181
if (
  !!notifier.update &&
  semver.gt(notifier.update.latest, notifier.update.current)
) {
  notifier.notify();
}

yargs
  .usage("Usage: $0 <command> [options]")
  .option("auth", {
    describe:
      "Plasmic auth file to use; by default, uses ~/.plasmic.auth, or the first .plasmic.auth file found in current and parent directories",
  })
  .option("config", {
    describe:
      "Plasmic config file to use; by default, uses the first plasmic.json file found in the current or parent directories",
  })
  .option("yes", {
    type: "boolean",
    describe: "Automatic yes to prompts.",
    default: false,
  })
  .command<InitArgs>(
    "init",
    "Initializes Plasmic for a project.",
    (yags) => {
      yags
        .option("host", {
          describe: "Plasmic host to use",
          type: "string",
          default: "https://studio.plasmic.app",
        })
        .option("platform", {
          describe: "Target platform to generate code for",
          choices: ["", "react", "nextjs", "gatsby"],
          default: "",
        })
        .option("code-lang", {
          describe: "Target language to generate code for",
          choices: ["", "js", "ts"],
          default: "",
        })
        .option("code-scheme", {
          describe: "Code generation scheme to use",
          choices: ["", "blackbox", "direct"],
          default: "",
        })
        .option("src-dir", {
          describe:
            "Default directory to put React component files (that you edit) into",
          type: "string",
          default: "",
        })
        .option("plasmic-dir", {
          describe:
            "Default directory to put Plasmic-managed files into; relative to src-dir",
          type: "string",
          default: "",
        })
        .option("pages-dir", {
          describe: "Default directory to put page files (that you edit) into",
          type: "string",
        })
        .option("style-scheme", {
          describe: "Styling framework to use",
          choices: ["", "css", "css-modules"],
          default: "",
        })
        .option("images-scheme", {
          describe: "How to reference used image files",
          choices: ["", "inlined", "files", "public-files"],
          default: "",
        })
        .option("images-public-dir", {
          describe: "Default directory to put public static files",
          type: "string",
          default: "",
        })
        .option("images-public-url-prefix", {
          describe: "URL prefix from which the app will serve static files",
          type: "string",
          default: "",
        });
    },
    (argv) => handleError(initPlasmic(argv))
  )
  .command<auth.AuthArgs>(
    "auth",
    "Authenticates you to plasmic.",
    (yags) => {
      yags
        .option("host", {
          describe: "Plasmic host to use",
          type: "string",
          default: "https://studio.plasmic.app",
        })
        .option("check", {
          alias: "c",
          describe: "Just verifies if the current credentials are valid.",
          type: "boolean",
        });
    },
    (argv) => {
      handleError(auth.auth(argv));
    }
  )
  .command<SyncArgs>(
    "sync",
    "Syncs designs from Plasmic to local files.",
    (yags) => configureSyncArgs(yags),
    (argv) => {
      handleError(sync(argv));
    }
  )
  .command<WatchArgs>(
    "watch",
    "Watches for updates to projects, and syncs them automatically to local files.",
    (yags) => configureSyncArgs(yags, false),
    (argv) => {
      handleError(watchProjects(argv));
    }
  )
  .command<FixImportsArgs>(
    "fix-imports",
    "Fixes import paths after you've moved around Plasmic blackbox files",
    (yags) => 0,
    (argv) => handleError(fixImports(argv))
  )
  .command<UploadBundleArgs>(
    "upload-bundle",
    false,
    (yargs) =>
      yargs
        .option("project", {
          alias: "p",
          describe: "ID of Plasmic project to upload the bundle to.",
          type: "string",
        })
        .option("bundleName", {
          describe: "Name of the bundle",
          type: "string",
        })
        .option("bundleJsFile", {
          describe: "Path of the bundled Javascript file in AMD format",
          type: "string",
        })
        .option("cssFiles", {
          describe: "Path of the bundled css files to load",
          type: "array",
          default: [],
        })
        .option("metaJsonFile", {
          describe:
            "Path of the meta data file (in JSON format) describing the component",
          type: "string",
        })
        .option("extraPropMetaJsonFile", {
          describe:
            "Path of the extra meta data file (in JSON format) describing the component's additional controlled properties and initial properties",
          type: "string",
        })
        .option("pkgVersion", {
          describe:
            "version of the package to include in the generated package.json",
          type: "string",
          default: "latest",
        })
        .option("genModulePath", {
          describe:
            "the path of include when generating import statement and generate package.json for. Default to bundleName.",
          type: "string",
        })
        .option("themeProviderWrapper", {
          describe: "the wrapper that inject theme to the bundle.",
          type: "string",
        })
        .option("themeModuleFile", {
          describe:
            "the typescript file that contains and exports the implementation of themeProviderWrapper. Used for code generation. It must be specified together with themeProviderWrapper.",
          type: "string",
        })
        .option("genCssPaths", {
          describe:
            "the list of css paths to import in generate code whenever a component in this bundle is used",
          type: "array",
          default: [],
        }),
    (argv) => handleError(uploadJsBundle(argv))
  )
  .demandCommand()
  .strict()
  .help("h")
  .alias("h", "help").argv;

function configureSyncArgs(
  yags: yargs.Argv,
  includeQuietOption: boolean = true
) {
  let args = yags
    .option("projects", {
      alias: "p",
      describe:
        "One or more projects to sync, separated by comma. Version constraints can be specified using @. Example: projectid, projectid@>=version",
      type: "array",
      default: [],
    })
    .option("force", {
      type: "boolean",
      describe: "Force sync to bypass specified version ranges.",
      default: false,
    })
    .option("non-recursive", {
      type: "boolean",
      describe:
        "Do not recursively sync dependencies, only sync the specified projects",
      default: false,
    })
    .option("force-overwrite", {
      type: "boolean",
      describe:
        "Overwrite the skeleton file with newly generated version. Useful when switching between codegen schemes.",
      default: false,
    })
    .option("append-jsx-on-missing-base", {
      type: "boolean",
      describe:
        "When the base metadata is missing to perform the three-way merge for direct edit component, append the jsx of the new version so that user can perform manual merge.",
      default: false,
    })
    .option("new-component-scheme", {
      type: "string",
      choices: ["blackbox", "direct"],
      describe:
        "Sync the new components using this code scheme rather than the default code scheme.",
    })
    .option("ignore-post-sync", {
      type: "boolean",
      describe: "Ignore post-sync commands in plasmic.json",
      default: false,
    });
  if (includeQuietOption) {
    args = args.option("quiet", {
      type: "boolean",
      describe: "Do not inform each asset to be synced",
      default: false,
    });
  }
  return args;
}

export interface CommonArgs {
  auth?: string;
  config?: string;
  yes?: boolean;
}
