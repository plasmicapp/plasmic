#!/usr/bin/env node
import { setMetadataEnv } from "@plasmicapp/cli";
import * as Sentry from "@sentry/node";
import * as fs from "fs";
import inquirer, { DistinctQuestion } from "inquirer";
import * as path from "upath";
import yargs from "yargs";
import * as cpa from "./lib";
import { assert, ensure, ensureString } from "./utils/lang-utils";
import { checkEngineStrict, updateNotify } from "./utils/npm-utils";

if (process.env.CPA_DEBUG_CHDIR) {
  process.chdir(process.env.CPA_DEBUG_CHDIR);
}

export type CodeScheme = "codegen" | "loader";

// Check for updates
const createPlasmicAppVersion = updateNotify();

// Specify command-line args
const argv = yargs
  .usage("Usage: $0 [options] <project-directory>")
  .example([
    ["$0 my-plasmic-app", "--- Create the project in `my-plasmic-app/`"],
  ])
  .option("platform", {
    describe: "Target platform",
    choices: ["", "nextjs", "gatsby", "react"],
    default: "",
  })
  .option("scheme", {
    describe: "Plasmic integration scheme",
    choices: ["", "codegen", "loader"],
    default: "",
  })
  .option("projectId", {
    describe: "Plasmic project ID",
    string: true,
    default: "",
  })
  .option("projectApiToken", {
    describe: "Plasmic project API token (optional, to bypass standard auth)",
    string: true,
    default: "",
  })
  .option("template", {
    describe: "Specify a template for the created project",
    string: true,
    default: "",
  })
  .option("typescript", {
    describe: "Use the default Typescript template",
    boolean: true,
    default: "",
  })
  .strict()
  .help("h")
  .alias("h", "help").argv;

// Initialize Sentry
Sentry.init({
  dsn:
    "https://0d602108de7f44aa9470a41cc069395f@o328029.ingest.sentry.io/5679926",
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
  question: DistinctQuestion<Record<string, T>>,
  checkCliAnswer = true
): Promise<T> {
  const name = ensure(question.name);
  const message = ensure(question.message);

  if (checkCliAnswer) {
    const cliAnswer = argv[name];
    if (cliAnswer !== null && cliAnswer !== undefined && cliAnswer !== "") {
      console.log(`${message}: ${cliAnswer} (specified in CLI arg)`);
      return cliAnswer as T; // assume it's the correct type
    }
  }

  const ans = await inquirer.prompt<Record<string, T>>(question);
  return ans[name];
}

// Keeping these as globals to easily share with our `crash` function
let projectName: string | undefined =
  argv._.length > 0 ? argv._[0] + "" : undefined;
let resolvedProjectPath: string;

/**
 * Main function
 */
async function run(): Promise<void> {
  /**
   * PROMPT USER
   */
  // User-specified project path/directory
  while (!cpa.checkValidName(projectName)) {
    projectName = (
      await inquirer.prompt({
        name: "projectPath",
        message: "What is your project named?",
        default: "my-app",
      })
    ).projectPath.trim();
  }
  // Absolute path to the new project
  resolvedProjectPath = path.resolve(projectName);

  // Prompt for Typescript
  const useTypescript: boolean = await maybePrompt({
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
  });

  // Prompt for the platform
  const platform = ensureString(
    await maybePrompt<string>({
      name: "platform",
      message: "What React framework do you want to use?",
      type: "list",
      choices: () => [
        {
          name: "Next.js",
          value: "nextjs",
        },
        {
          name: "Gatsby",
          value: "gatsby",
        },
        {
          name: "Create React App",
          value: "react",
        },
      ],
      default: "nextjs",
    })
  );

  // Scheme to use for Plasmic integration
  // - loader only available for gatsby/next.js
  const scheme: CodeScheme =
    platform === "nextjs" || platform === "gatsby"
      ? await maybePrompt({
          name: "scheme",
          message: "Which scheme do you want to use to integrate Plasmic?",
          type: "list",
          choices: () => [
            {
              name: "PlasmicLoader: recommended default for most websites",
              short: "PlasmicLoader",
              value: "loader",
            },
            {
              name: "Codegen: for building complex stateful apps",
              short: "Codegen",
              value: "codegen",
            },
          ],
          default: "loader",
        })
      : "codegen";

  // Get the projectId
  console.log();
  let projectId: string | undefined;
  let firstPrompt = true;
  while (!projectId) {
    const rawProjectId = await maybePrompt<string>(
      {
        name: "projectId",
        message: `If you don't have a project yet, create one by going to https://studio.plasmic.app/starters/blank.
What is the URL of your project?`,
      },
      firstPrompt
    );
    firstPrompt = false; // avoid infinite loop with an invalid CLI answer

    const matchUrl = rawProjectId.match(
      /studio\.plasmic\.app\/projects\/([a-z0-9]{5,})(\/|$)/i
    );
    if (matchUrl) {
      projectId = matchUrl[1];
      continue;
    }

    // allow passing in a project ID
    const matchId = rawProjectId.match(/([a-z0-9]{5,})/i);
    if (matchId) {
      projectId = matchId[1];
      continue;
    }

    console.error(`"${rawProjectId}" is not a valid project URL nor ID.`);
  }

  // RUN IT
  console.log();
  assert(
    platform === "nextjs" || platform === "gatsby" || platform === "react",
    "platform must be one of ['nextjs', 'gatsby', 'react']"
  );

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
    scheme,
    useTypescript,
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
