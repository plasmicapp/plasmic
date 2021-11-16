import { auth, getProjectApiToken, setMetadataEnv } from "@plasmicapp/cli";
import chalk from "chalk";
import * as path from "upath";
import validateProjectName from "validate-npm-package-name";
import { getCPAStrategy } from "./strategies";
import { ensureTsconfig, overwriteReadme } from "./utils/file-utils";
import { detectPackageManager } from "./utils/npm-utils";

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
    useTypescript,
    template,
  } = args;
  let { projectApiToken } = args;
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

  if (!["codegen", "loader"].includes(scheme)) {
    throw new Error(`Unrecognized Plasmic scheme: ${scheme}`);
  }

  const cpaStrategy = getCPAStrategy(platform);

  // Create project using strategy for platform
  await cpaStrategy.create({
    projectPath: resolvedProjectPath,
    useTypescript,
    template,
  });

  // Ensure that we have a empty tsconfig and @types packages
  // Gatsby by default supports typescript handling internally
  // tsconfig so we don't have to ensure it
  if (useTypescript && platform !== "gatsby") {
    await ensureTsconfig(resolvedProjectPath);
  }

  // Make sure we have an api token for loader
  if (scheme === "loader" && !projectApiToken) {
    projectApiToken = await getProjectApiToken(projectId);
    if (!projectApiToken) {
      throw new Error(`Failed to get projectApiToken for ${projectId}`);
    }
  }

  // Install dependency
  banner("INSTALLING THE PLASMIC DEPENDENCY");
  const installResult = await cpaStrategy.installDeps({
    scheme,
    projectPath: resolvedProjectPath,
  });

  if (!installResult) {
    throw new Error("Failed to install the Plasmic dependency");
  }

  // Configure
  await cpaStrategy.overwriteConfig({
    projectId,
    projectPath: resolvedProjectPath,
    projectApiToken,
    useTypescript,
    scheme,
  });

  // Generate files
  await cpaStrategy.generateFiles({
    projectPath: resolvedProjectPath,
    useTypescript,
    scheme,
    projectId,
    projectApiToken,
  });

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
 * Re-export this so that consumers (e.g. plasmic-action)
 * can use it too
 */
export const setMetadata = setMetadataEnv;
