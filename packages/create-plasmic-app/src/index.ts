#!/usr/bin/env node
import { setMetadataEnv } from "@plasmicapp/cli";
import * as Sentry from "@sentry/node";
import * as fs from "fs";
import inquirer, { DistinctQuestion } from "inquirer";
import * as path from "upath";
import yargs from "yargs";
import * as cpa from "./lib";
import { ensure } from "./utils/lang-utils";
import { checkEngineStrict, updateNotify } from "./utils/npm-utils";
import { PlatformOptions, PlatformType, SchemeType } from "./utils/types";

if (process.env.CPA_DEBUG_CHDIR) {
  process.chdir(process.env.CPA_DEBUG_CHDIR);
}

// Check for updates
const createPlasmicAppVersion = updateNotify();

// Specify command-line args
const argv = yargs
  .command(
    "$0 [projectName]",
    "Create a Plasmic app with Next.js, Gatsby, or Create React App",
    (yargs) => {
      yargs
        .usage("Usage: $0 [projectName] [options]")
        .positional("projectName", {
          describe: "Project and NPM package name",
          string: true,
        });
    }
  )
  .option("platform", {
    describe: "Target platform",
    choices: ["", "nextjs", "gatsby", "react"],
  })
  .option("scheme", {
    describe: "Plasmic integration scheme",
    choices: ["", "codegen", "loader"],
  })
  .option("projectId", {
    describe: "Plasmic project ID",
    string: true,
  })
  .option("projectApiToken", {
    describe: "Plasmic project API token (optional, to bypass standard auth)",
    string: true,
  })
  .option("template", {
    describe: "Specify a template for the created project",
    string: true,
  })
  .option("typescript", {
    describe: "Use Typescript?",
    boolean: true,
  })
  .option("appDir", {
    describe: "(Next.js) Use app directory (experimental)?",
    boolean: true,
  })
  .strict()
  .help("h")
  .alias("h", "help")
  .check((argv) => {
    if (
      argv.scheme === "loader" &&
      !(argv.platform === "nextjs" || argv.platform === "gatsby")
    ) {
      throw new Error(`Loader scheme may only be used with Next.js or Gatsby`);
    }

    if (
      argv.appDir &&
      !(argv.platform === "nextjs" && argv.scheme === "loader")
    ) {
      throw new Error(
        `App dir may only be used with Next.js and loader scheme`
      );
    }

    return true;
  }).argv;

// Initialize Sentry
Sentry.init({
  dsn: "https://0d602108de7f44aa9470a41cc069395f@o328029.ingest.sentry.io/5679926",
});
Sentry.configureScope((scope) => {
  //scope.setUser({ email: auth.user });
  scope.setExtra("cliVersion", createPlasmicAppVersion);
  scope.setExtra("args", JSON.stringify(argv));
});

/**
 * Prompt the user for any answers that we're missing from the command-line args
 * @param question instance of a question formatted for `inquirer`
 * @returns
 */
async function maybePrompt<T>(
  question: DistinctQuestion<Record<string, unknown>>
): Promise<T> {
  const name = ensure(question.name);
  const message = ensure(question.message);

  const cliAnswer = argv[name];
  if (
    cliAnswer !== null &&
    cliAnswer !== undefined &&
    cliAnswer !== "" &&
    (!question.validate || question.validate(cliAnswer))
  ) {
    console.log(`${message}: ${cliAnswer} (specified in CLI arg)`);
    return cliAnswer as T; // assume it's the correct type
  }

  const ans = await inquirer.prompt<Record<string, T>>(question);
  return ans[name];
}

// Keeping these as globals to easily share with our `crash` function
const projectName: string | undefined =
  argv._.length > 0 ? argv._[0] + "" : undefined;
let resolvedProjectPath: string;

/**
 * Main function
 */
async function run(): Promise<void> {
  /**
   * PROMPT USER
   */
  // User-specified project name
  const projectName = await maybePrompt({
    name: "projectName",
    message: "What is your project named?",
    default: "my-app",
    validate: cpa.checkValidName,
  });
  // Absolute path to the new project
  resolvedProjectPath = path.resolve(projectName);

  // Prompt for Typescript
  const jsOrTs = (await maybePrompt({
    name: "typescript",
    message: "What language do you want to use?",
    type: "list",
    choices: () => [
      {
        name: "TypeScript",
        value: true,
      },
      {
        name: "JavaScript",
        value: false,
      },
    ],
    default: true,
  }))
    ? "ts"
    : "js";

  // Prompt for the platform
  const platform = await maybePrompt<PlatformType>({
    name: "platform",
    message: "What React framework do you want to use?",
    type: "list",
    choices: () => [
      {
        name: "Next.js (recommended)",
        short: "Next.js",
        value: "nextjs",
      },
      {
        name: "Gatsby",
        value: "gatsby",
      },
      {
        name: "Create React App (advanced)",
        short: "Create React App",
        value: "react",
      },
    ],
    default: "nextjs",
  });

  // Scheme to use for Plasmic integration
  // - loader only available for gatsby/next.js
  const scheme: SchemeType =
    platform === "nextjs" || platform === "gatsby"
      ? await maybePrompt({
          name: "scheme",
          message: "Which scheme do you want to use to integrate Plasmic?",
          type: "list",
          choices: () => [
            {
              name: "PlasmicLoader (recommended default for most websites)",
              short: "PlasmicLoader",
              value: "loader",
            },
            {
              name: "Codegen (advanced feature for building complex stateful apps)",
              short: "Codegen",
              value: "codegen",
            },
          ],
          default: "loader",
        })
      : "codegen";

  // TODO: Support nextjs + codegen
  const platformOptions: PlatformOptions = {};
  // Don't show app dir question until we have better support for app dir.
  const showAppDirQuestion = false;
  if (showAppDirQuestion && platform === "nextjs" && scheme === "loader") {
    platformOptions.nextjs = {
      appDir: await maybePrompt({
        name: "appDir",
        message:
          "Do you want to use the app/ directory and React Server Components? (see https://beta.nextjs.org/docs/app-directory-roadmap)",
        type: "list",
        choices: () => [
          {
            name: "No, use pages/ directory",
            short: "No",
            value: false,
          },
          {
            name: "Yes, use app/ directory (experimental)",
            short: "Yes",
            value: true,
          },
        ],
        default: false,
      }),
    };
  }

  // Get the projectId
  console.log();
  const projectInput = await maybePrompt<string>({
    name: "projectId",
    message: `If you don't have a project yet, create one by going to https://studio.plasmic.app/starters/blank.
What is the URL of your project?`,
    validate: cpa.checkProjectInput,
  });
  const projectId = cpa.extractProjectId(projectInput);

  // RUN IT
  console.log();

  const template = argv["template"];
  const projectApiToken = argv["projectApiToken"];

  // Set the metadata environment variable to tag the future Segment codegen event
  setMetadataEnv({
    source: "create-plasmic-app",
  });
  await cpa.create({
    resolvedProjectPath,
    projectId,
    platform,
    platformOptions,
    scheme,
    jsOrTs,
    projectApiToken,
    template,
  });
}

run().catch((err) => {
  console.log();
  console.log("Aborting installation.");
  cpa.banner("create-plasmic-app failed!");

  console.error("Unexpected error: ");
  console.error(err);
  console.log();

  // Instruct user to remove artifacts
  if (resolvedProjectPath && fs.existsSync(resolvedProjectPath)) {
    console.log(`Please remove ${resolvedProjectPath} and try again.`);
  }

  // Check if we satisfy the engine policy
  const satisfiesVersion = checkEngineStrict();

  // Log to Sentry only if user has correct Node version
  if (satisfiesVersion && err) {
    Sentry.captureException(err);
  }

  process.exit(1);
});
