#!/usr/bin/env node
import yargs from "yargs";
import * as auth from "./actions/auth";
import { fixImports, FixImportsArgs } from "./actions/fix-imports";
import { InfoArgs, printProjectInfo } from "./actions/info";
import { getYargsOption, InitArgs, initPlasmic } from "./actions/init";
import {
  getLocalizationYargs,
  localizationStrings,
  LocalizationStringsArgs,
} from "./actions/localization-strings";
import * as projectToken from "./actions/project-token";
import { sync, SyncArgs } from "./actions/sync";
import { UploadBundleArgs, uploadJsBundle } from "./actions/upload-bundle";
import { WatchArgs, watchProjects } from "./actions/watch";
import { handleError } from "./utils/error";
import { ExportArgs, exportProjectsCli } from "./actions/export";

if (process.env.DEBUG_CHDIR) {
  process.chdir(process.env.DEBUG_CHDIR);
}

// TODO: we cannot use update-notifier, as it uses lazy-import, which
// cannot be compiled into a single bundle with esbuild.
// Check once an hour
// const pkg = require("../package.json");
// const notifier = updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 });
// // Workaround for this bug
// // https://github.com/yeoman/update-notifier/issues/181
// if (
//   !!notifier.update &&
//   semver.gt(notifier.update.latest, notifier.update.current)
// ) {
//   notifier.notify();
// }

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
        .option("enable-skip-auth", {
          describe: "Enable skipping auth, just initialize a plasmic.json",
          type: "boolean",
          default: false,
        })
        .option("host", getYargsOption("host", "https://studio.plasmic.app"))
        .option("platform", getYargsOption("platform"))
        .option("code-lang", getYargsOption("codeLang"))
        .option("code-scheme", getYargsOption("codeScheme"))
        .option("react-runtime", {
          describe: "React runtime to use; either classic or automatic",
          choices: ["classic", "automatic"],
          default: "classic",
        })
        .option("src-dir", getYargsOption("srcDir"))
        .option("plasmic-dir", getYargsOption("plasmicDir"))
        .option("pages-dir", getYargsOption("pagesDir"))
        .option("style-scheme", getYargsOption("styleScheme"))
        .option("images-scheme", getYargsOption("imagesScheme"))
        .option("images-public-dir", getYargsOption("imagesPublicDir"))
        .option(
          "images-public-url-prefix",
          getYargsOption("imagesPublicUrlPrefix")
        );
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
        })
        .option("email", {
          describe:
            "Print the email of the currently authenticated user and exit.",
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
      handleError(
        sync(argv, {
          source: "cli",
          scheme: "codegen",
          command: "sync",
        })
      );
    }
  )
  .command<WatchArgs>(
    "watch",
    "Watches for updates to projects, and syncs them automatically to local files.",
    (yags) => configureSyncArgs(yags, false),
    (argv) => {
      handleError(
        watchProjects(argv, {
          source: "cli",
          scheme: "codegen",
          command: "watch",
        })
      );
    }
  )
  .command<FixImportsArgs>(
    "fix-imports",
    "Fixes import paths after you've moved around Plasmic blackbox files",
    (yags) =>
      yags.option("skip-formatting", {
        type: "boolean",
        describe: "Skip formatting of modified code",
        default: false,
      }),
    (argv) => handleError(fixImports(argv))
  )
  .command<InfoArgs>(
    "info",
    "Fetches metadata for projects",
    (yags) =>
      yags
        .option("host", {
          describe: "Plasmic host to use",
          type: "string",
          default: "https://studio.plasmic.app",
        })
        .option("projects", {
          alias: "p",
          describe: "ID of plasmic project to check",
          type: "array",
          default: [],
        })
        .option("json", {
          describe: "Output full info, not just summary, in JSON format",
          type: "boolean",
          default: false,
        }),
    (argv) => {
      handleError(printProjectInfo(argv));
    }
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
  .command<projectToken.ProjectTokenArgs>(
    "project-token <projectId>",
    "Get projectApiToken for a given project",
    (yargs) =>
      yargs
        .positional("projectId", {
          describe: "projectId",
          type: "string",
        })
        .option("host", {
          describe: "Plasmic host to use",
          type: "string",
          default: "https://studio.plasmic.app",
        }),
    (argv) => handleError(projectToken.projectToken(argv))
  )
  .command<LocalizationStringsArgs>(
    "localization-strings",
    "Generate localization strings",
    (yargs) =>
      yargs
        .option("projects", {
          alias: "p",
          describe:
            "One or more projects to generate localization strings, separated by comma. Version constraints can be specified using @. Example: projectid, projectid@>=version. If not specified, will be derived from plasmic.json if you are using codegen.",
          type: "array",
        })
        .option("host", {
          describe: "Plasmic host to use",
          type: "string",
          default: "https://studio.plasmic.app",
        })
        .option("format", {
          describe: 'Output format. Either "json", "po" or "lingui"',
          type: "string",
          choices: ["json", "po", "lingui"],
          default: "json",
        })
        .option("key-scheme", getLocalizationYargs("key-scheme"))
        .option("tag-prefix", getLocalizationYargs("tag-prefix"))
        .option("exclude-deps", {
          type: "boolean",
          describe:
            "By default, strings from imported dependencies are also included. Specify --exclude-deps to only include strings from projects you explicitly specify.",
          default: false,
        })
        .option("output", {
          alias: "o",
          describe: "Output file",
          type: "string",
        })
        .option("force-overwrite", {
          type: "boolean",
          describe: "Overwrite the output file.",
          default: false,
        })
        .option("project-tokens", {
          type: "array",
          default: [],
          describe:
            "(Optional) List of project API tokens to be used for auth, in the format PROJECT_ID:PROJECT_API_TOKEN (the pairs should be separated by comma)",
        }),
    (argv) => handleError(localizationStrings(argv))
  )
  .command<ExportArgs>(
    "export",
    false,
    (yargs) =>
      yargs
        .option("projects", {
          alias: "p",
          describe: "ID of project to export from",
          type: "array",
        })
        .option("out-dir", {
          alias: "o",
          describe: "Folder to output exported code to",
          type: "string",
        })
        .option("platform", getYargsOption("platform"))
        .option("code-lang", getYargsOption("codeLang"))
        .option("code-scheme", getYargsOption("codeScheme"))
        .option("style-scheme", getYargsOption("styleScheme"))
        .option("images-scheme", {
          describe:
            "How to reference used images in designs; either `inlined`, which puts base64-encoded images directly into the React component files, or `files`, which puts images on disk and imports them from component files.",
          type: "string",
          choices: ["inlined", "files"],
        })
        .option("i18n-key-scheme", getLocalizationYargs("key-scheme"))
        .option("i18n-tag-prefix", getLocalizationYargs("tag-prefix")),
    (argv) => handleError(exportProjectsCli(argv))
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
    .option("ignore-post-sync", {
      type: "boolean",
      describe: "Ignore post-sync commands in plasmic.json",
      default: false,
    })
    .option("skip-upgrade-check", {
      type: "boolean",
      describe: "Skip upgrade check for Plasmic dependencies",
      default: false,
    })
    .option("metadata", {
      type: "string",
      describe:
        "Pass metadata through to the server. Use querystring format (e.g. command=sync&source=cli&cli_version=1.0.0",
      default: "source=cli",
      hidden: true,
    })
    .option("skip-formatting", {
      type: "boolean",
      describe: "Disables formatting on generated code",
      default: false,
    })
    .option("skip-buffering", {
      type: "boolean",
      describe:
        "Write files directly to disk, instead of buffering and only writing if sync completes successfully",
      default: false,
    })
    .option("all-files", {
      type: "boolean",
      describe:
        "Sync all files, including those that haven't changed since last sync",
      default: "",
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
  baseDir: string;
  auth?: string;
  config?: string;
  yes?: boolean;
}
