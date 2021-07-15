import { auth, setMetadataEnv } from "@plasmicapp/cli";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "upath";
import validateProjectName from "validate-npm-package-name";
import {
  modifyDefaultGatsbyConfig,
  overwriteIndex,
  overwriteReadme,
  wrapAppRoot,
  writeDefaultNextjsConfig,
  writePlasmicLoaderJson,
} from "./utils/file-utils";
import { detectPackageManager, installUpgrade, spawn } from "./utils/npm-utils";

export type PlatformType = "nextjs" | "gatsby" | "react";
export type SchemeType = "codegen" | "loader";

export function toString(s: PlatformType): string {
  return s === "nextjs" ? "Next.js" : s === "gatsby" ? "Gatsby" : "React";
}

export interface CreatePlasmicAppArgs {
  resolvedProjectPath: string;
  projectId: string;
  platform: PlatformType;
  scheme: SchemeType;
  useTypescript: boolean;
  projectApiToken?: string;
  template?: string;
}

export async function create(args: CreatePlasmicAppArgs): Promise<void> {
  const {
    resolvedProjectPath,
    projectId,
    platform,
    scheme,
    projectApiToken,
    useTypescript,
    template,
  } = args;
  console.log("Let's get started! Here's what we'll do: ");
  console.log("1. Authenticate with Plasmic");
  console.log("2. Create a React/Next/Gatsby repo");
  console.log("3. Integrate with Plasmic");

  // Authenticate with Plasmic
  banner("AUTHENTICATING WITH PLASMIC");
  if (projectApiToken) {
    console.log("Skipping auth; using the given project API token.");
  } else {
    const promise = auth({
      host: "https://studio.plasmic.app",
      check: true,
    })
      .catch(() => {
        return auth({ host: "https://studio.plasmic.app" });
      })
      .catch(() => {
        throw new Error(
          "Failed to authenticate with Plasmic. Please run `npx @plasmicapp/cli auth` manually."
        );
      });
    await promise;
  }

  // Calling `npx create-XXX` means we don't have to keep these dependencies up to date
  banner("CREATING THE PROJECT");
  if (!["nextjs", "gatsby", "react"].includes(platform)) {
    throw new Error(`Unrecognized platform: ${platform}`);
  }
  let createCommand = "";
  if (platform === "nextjs") {
    createCommand += `npx -p create-next-app create-next-app ${resolvedProjectPath}`;
    if (template) {
      createCommand += ` --example ${template}`;
    }
    // Default Next.js starter already supports Typescript
    // See where we `touch tsconfig.json` later on
  } else if (platform === "gatsby") {
    createCommand += `npx -p gatsby gatsby new ${resolvedProjectPath}`;
    if (template) {
      createCommand += ` ${template}`;
    }
    // Default Gatsby starter already supports Typescript
    // See where we `touch tsconfig.json` later on
  } else if (platform === "react") {
    createCommand += `npx -p create-react-app create-react-app ${resolvedProjectPath}`;
    if (template) {
      createCommand += ` --template ${template}`;
    } else if (useTypescript) {
      createCommand += " --template typescript";
    }
  } else {
    throw new Error(`Unrecognized platform: ${platform}`);
  }
  await spawnOrFail(createCommand);

  // Create tsconfig.json if it doesn't exist
  // this will force Plasmic to recognize Typescript
  const tsconfigPath = path.join(resolvedProjectPath, "tsconfig.json");
  if (useTypescript && !fs.existsSync(tsconfigPath)) {
    fs.writeFileSync(tsconfigPath, "");
    const installTsResult = await installUpgrade("typescript @types/react", {
      workingDir: resolvedProjectPath,
    });
    if (!installTsResult) {
      throw new Error("Failed to install Typescript");
    }
  }

  // Install dependency
  banner("INSTALLING THE PLASMIC DEPENDENCY");
  const installResult =
    scheme === "loader"
      ? await installUpgrade("@plasmicapp/loader", {
          workingDir: resolvedProjectPath,
        })
      : await installUpgrade("@plasmicapp/cli", {
          workingDir: resolvedProjectPath,
        });
  if (!installResult) {
    throw new Error("Failed to install the Plasmic dependency");
  }

  // Trigger a sync
  const pkgMgr = detectPackageManager(resolvedProjectPath);
  const npmRunCmd = pkgMgr === "yarn" ? "yarn" : "npm run";
  if (scheme === "codegen") {
    banner("SYNCING PLASMIC COMPONENTS");
    const project = projectApiToken
      ? `${projectId}:${projectApiToken}`
      : projectId;
    if (platform === "nextjs") {
      await writeDefaultNextjsConfig(resolvedProjectPath, projectId, false);
    }
    await spawnOrFail(
      `npx -p @plasmicapp/cli plasmic sync --yes -p ${project}`,
      resolvedProjectPath
    );
  } else if (scheme === "loader") {
    if (platform === "nextjs") {
      await writeDefaultNextjsConfig(resolvedProjectPath, projectId, true);
    } else if (platform === "gatsby") {
      await modifyDefaultGatsbyConfig(resolvedProjectPath, projectId);
    } else {
      throw new Error(
        "PlasmicLoader is only compatible with either Next.js or Gatsby"
      );
    }
    if (projectApiToken) {
      await writePlasmicLoaderJson(
        resolvedProjectPath,
        projectId,
        projectApiToken
      );
    }
    await spawnOrFail(`${npmRunCmd} build`, resolvedProjectPath);
  } else {
    throw new Error(`Unrecognized Plasmic scheme: ${scheme}`);
  }

  // Overwrite the index file
  await overwriteIndex(resolvedProjectPath, platform, scheme);

  // Overwrite the wrapper files to wrap PlasmicRootProvider
  await wrapAppRoot(resolvedProjectPath, platform, scheme);

  /**
   * INSTRUCT USER ON NEXT STEPS
   */
  const command =
    platform === "nextjs"
      ? `${npmRunCmd} dev`
      : platform === "gatsby"
      ? `${npmRunCmd} develop`
      : platform === "react"
      ? `${npmRunCmd} start`
      : "";
  const relativeDir = path.relative(process.cwd(), resolvedProjectPath);

  // Overwrite README
  await overwriteReadme(resolvedProjectPath, platform, command);

  console.log("----------------------------------------");
  console.log(
    chalk.green.bold(
      `Congrats! We created the Plasmic-connected project at ${relativeDir}`
    )
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
  if (scheme === "codegen") {
    console.log(
      "To watch for changes in Plasmic components, in a separate terminal run:"
    );
    console.log(chalk.bold(`npx plasmic watch`));
  }
}

export function checkValidName(name?: string): boolean {
  // User need to specify a truthy value
  if (!name) {
    console.warn("Please specify the project directory");
    return false;
  }

  // Check that projectName is a valid npm package name
  const nameValidation = validateProjectName(name);
  if (!nameValidation.validForNewPackages) {
    if (nameValidation.warnings) {
      nameValidation.warnings.forEach((e) => console.warn(e));
    }
    if (nameValidation.errors) {
      nameValidation.errors.forEach((e) => console.error(e));
    }
    console.warn(
      `'${name}' is not a valid name for an npm package. Please choose another name.`
    );
    return false;
  }

  return true;
}

export function banner(message: string): void {
  // 50-char width
  console.log();
  console.log("==================================================");
  console.log(chalk.bold(message));
  console.log("==================================================");
}

/**
 * Run a command synchronously
 * @returns
 */
async function spawnOrFail(
  cmd: string,
  workingDir?: string,
  customErrorMsg?: string
) {
  const result = await spawn(cmd, workingDir);
  if (!result) {
    throw new Error(customErrorMsg ?? `Failed to run "${cmd}"`);
  }
}

/**
 * Re-export this so that consumers (e.g. plasmic-action)
 * can use it too
 */
export const setMetadata = setMetadataEnv;
