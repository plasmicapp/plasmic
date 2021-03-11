#!/usr/bin/env node
import chalk from "chalk";
import * as fs from "fs";
import inquirer, { DistinctQuestion } from "inquirer";
import * as path from "path";
import validateProjectName from "validate-npm-package-name";
import yargs from "yargs";
import {
  modifyDefaultGatsbyConfig,
  writeDefaultCraAppjs,
  writeDefaultNextjsConfig,
} from "./utils/file-utils";
import { ensure, ensureString } from "./utils/lang-utils";
import {
  detectPackageManager,
  installUpgrade,
  spawn,
  updateNotify,
} from "./utils/npm-utils";

// Check for updates
updateNotify();

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
  .strict()
  .help("h")
  .alias("h", "help").argv;

/**
 * Prompt the user for any answers that we're missing from the command-line args
 * @param question instance of a question formatted for `inquirer`
 * @returns
 */
async function maybePrompt(question: DistinctQuestion) {
  const name = ensure(question.name) as string;
  const message = ensure(question.message);
  const maybeAnswer = argv[name] as string;
  if (maybeAnswer) {
    console.log(message + maybeAnswer + "(specified in CLI arg)");
    return ensureString(argv[name]);
  } else {
    const ans = await inquirer.prompt({ ...question });
    return ans[name];
  }
}

// Keeping these as globals to easily share with our `crash` function
let projectPath: string;
let resolvedProjectPath: string;
/**
 * Main function
 */
async function run(): Promise<void> {
  /**
   * PROMPT USER
   */
  // User-specified project path/directory
  projectPath = (argv._.length > 0
    ? argv._[0] + "" // coerce to a string
    : (
        await inquirer.prompt({
          name: "projectPath",
          message: "What is your project named?",
          default: "my-app",
        })
      ).projectPath
  ).trim();
  // Absolute path to the new project
  resolvedProjectPath = path.resolve(projectPath);
  // Reuse the basename as the project name
  const projectName = path.basename(resolvedProjectPath);

  // User need to specify a truthy value
  if (!projectPath) {
    return crash("Please specify the project directory");
  }

  // Check that projectName is a valid npm package name
  const nameValidation = validateProjectName(projectName);
  if (!nameValidation.validForNewPackages) {
    if (nameValidation.warnings) {
      nameValidation.warnings.forEach((e) => console.warn(e));
    }
    if (nameValidation.errors) {
      nameValidation.errors.forEach((e) => console.error(e));
    }
    return crash(
      `${projectName} is not a valid name for an npm package. Please choose another name.`
    );
  }

  // Prompt for the platform
  const platform = await maybePrompt({
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
  });

  // Scheme to use for Plasmic integration
  // - loader only available for gatsby/next.js
  const scheme: "codegen" | "loader" =
    platform === "nextjs" || platform === "gatsby"
      ? await maybePrompt({
          name: "scheme",
          message: "What scheme do you want to use to integrate with Plasmic?",
          type: "list",
          choices: () => [
            {
              name: "PlasmicLoader",
              value: "loader",
            },
            {
              name: "Codegen",
              value: "codegen",
            },
          ],
          default: "loader",
        })
      : "codegen";

  // Get the projectId
  console.log();
  console.log(chalk.green.bold("Go to this URL and **clone** the project:"));
  console.log("https://studio.plasmic.app/starters/simple-light");
  console.log();
  console.log("  Note the project ID in the URL redirect");
  console.log("  (e.g. https://studio.plasmic.app/projects/PROJECT_ID)");
  let projectId: string | undefined;
  while (!projectId) {
    const rawProjectId = await maybePrompt({
      name: "projectId",
      message: "What is the project ID of your project?",
    });
    projectId = rawProjectId
      .replace("https://studio.plasmic.app/projects/", "")
      .trim();
    if (!projectId) {
      console.error(`"${rawProjectId}" is not a valid project ID.`);
    }
  }

  /**
   * CREATE RESOURCES
   */

  // Authenticate with Plasmic
  console.log("Authenticating with Plasmic...");
  const authCheckResult = spawn("npx @plasmicapp/cli auth -c");
  if (authCheckResult.status !== 0) {
    const authResult = spawn("npx @plasmicapp/cli auth");
    if (authResult.status !== 0) {
      return crash(
        "Failed to authenticate with Plasmic. Please run `npx @plasmicapp/cli auth` manually."
      );
    }
  }

  // Calling `npx create-XXX` means we don't have to keep these dependencies up to date
  console.log("Creating the project...");
  const createResult =
    platform === "nextjs"
      ? spawn(`npx create-next-app ${resolvedProjectPath}`)
      : platform === "gatsby"
      ? spawn(`npx gatsby new ${resolvedProjectPath}`)
      : platform === "react"
      ? spawn(`npx create-react-app ${resolvedProjectPath}`)
      : undefined;
  if (!createResult) {
    return crash(`Unrecognized platform: ${platform}`);
  } else if (createResult.status !== 0) {
    return crash("Error creating project", createResult.error);
  }

  // Install dependency
  console.log("Installing the Plasmic dependency...");
  const installResult =
    scheme === "loader"
      ? installUpgrade("@plasmicapp/loader", {
          workingDir: resolvedProjectPath,
        })
      : installUpgrade("@plasmicapp/cli", { workingDir: resolvedProjectPath });
  if (!installResult) {
    return crash("Failed to install the Plasmic dependency");
  }

  // Sync only if codegen
  if (scheme === "codegen") {
    console.log("Syncing Plasmic components...");
    const syncResult = spawn(
      `npx plasmic sync --yes -p ${projectId}`,
      resolvedProjectPath
    );
    if (syncResult.status !== 0) {
      return crash("Failed to sync project");
    }
  }

  // Write files necessary to make renders work
  if (scheme === "loader" && platform === "nextjs") {
    await writeDefaultNextjsConfig(resolvedProjectPath, projectId);
  } else if (scheme === "codegen" && platform === "nextjs") {
    // Pages are automatically written by `plasmic sync`
  } else if (scheme === "loader" && platform === "gatsby") {
    await modifyDefaultGatsbyConfig(resolvedProjectPath, projectId);
  } else if (scheme === "codegen" && platform === "gatsby") {
    // Pages are automatically written by `plasmic sync`
  } else if (scheme === "codegen" && platform === "react") {
    await writeDefaultCraAppjs(resolvedProjectPath);
  } else {
    return crash(`Unrecognized config [${platform}, ${scheme}]`);
  }

  /**
   * INSTRUCT USER ON NEXT STEPS
   */
  const pkgMgr = detectPackageManager(resolvedProjectPath);
  const npmRunCmd = pkgMgr === "yarn" ? "yarn" : "npm run";
  const command =
    platform === "nextjs"
      ? `${npmRunCmd} dev`
      : platform === "gatsby"
      ? `${npmRunCmd} develop`
      : platform === "react"
      ? `${npmRunCmd} start`
      : undefined;
  const relativeDir = path.relative(process.cwd(), resolvedProjectPath);
  console.log("----------------------------------------");
  console.log(
    chalk.green.bold(`Congrats! We created the project at ${relativeDir}`)
  );
  console.log();
  console.log();
  console.log();
  console.log(
    "Change directories into your new project and start the development server:"
  );
  console.log();
  console.log(chalk.bold(`cd ${relativeDir}`));
  console.log(chalk.bold(command));
  console.log();
  if (platform === "nextjs" || platform === "gatsby") {
    console.log(
      "Navigate to the routes (e.g. /home) defined by your page components from Plasmic Studio."
    );
  }
}

/**
 * Call this to exit the script with an error message
 * @param message
 * @param err
 */
function crash(message: string, err?: Error) {
  console.log();
  console.log(message);
  if (err) {
    console.error("Unexpected error: ");
    console.error(err);
  }
  console.log();
  if (fs.existsSync(resolvedProjectPath)) {
    console.log(`Please remove ${resolvedProjectPath} and try again.`);
  }
  process.exit(1);
}

run().catch((err) => {
  console.log("Aborting installation.");
  crash("Caught exception: ", err);
});
