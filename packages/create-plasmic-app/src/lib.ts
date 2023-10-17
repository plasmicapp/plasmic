import { auth, getProjectApiToken, setMetadataEnv } from "@plasmicapp/cli";
import chalk from "chalk";
import * as path from "upath";
import validateProjectName from "validate-npm-package-name";
import { ensureTsconfig, overwriteReadme } from "./utils/file-utils";
import { detectPackageManager } from "./utils/npm-utils";
import { CPAStrategy } from "./utils/strategy";
import {
  JsOrTs,
  PlatformOptions,
  PlatformType,
  SchemeType,
} from "./utils/types";

async function getCPAStrategy(platform: PlatformType): Promise<CPAStrategy> {
  switch (platform) {
    case "nextjs":
      return (await import("./nextjs/nextjs")).nextjsStrategy;
    case "gatsby":
      return (await import("./gatsby/gatsby")).gatsbyStrategy;
    case "react":
      return (await import("./react/react")).reactStrategy;
  }
}

export interface CreatePlasmicAppArgs {
  resolvedProjectPath: string;
  projectId: string;
  platform: PlatformType;
  platformOptions: PlatformOptions;
  scheme: SchemeType;
  jsOrTs: JsOrTs;
  projectApiToken?: string;
  template?: string;
}

export async function create(args: CreatePlasmicAppArgs): Promise<void> {
  const {
    resolvedProjectPath,
    projectId,
    platform,
    platformOptions,
    scheme,
    jsOrTs,
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

  const cpaStrategy = await getCPAStrategy(platform);

  // Create project using strategy for platform
  await cpaStrategy.create({
    projectPath: resolvedProjectPath,
    jsOrTs,
    template,
    platformOptions,
  });

  // Ensure that we have a empty tsconfig and @types packages.
  // Gatsby and Next.js by default support typescript handling internally
  // tsconfig so we don't have to ensure it.
  if (jsOrTs === "ts" && platform === "react") {
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
    jsOrTs,
  });

  if (!installResult) {
    throw new Error("Failed to install the Plasmic dependency");
  }

  // Configure
  await cpaStrategy.overwriteConfig({
    projectId,
    projectPath: resolvedProjectPath,
    projectApiToken,
    jsOrTs,
    scheme,
    platformOptions,
  });

  // Generate files
  await cpaStrategy.generateFiles({
    projectPath: resolvedProjectPath,
    jsOrTs,
    scheme,
    projectId,
    projectApiToken,
    platformOptions,
  });

  /**
   * INSTRUCT USER ON NEXT STEPS
   */
  const pkgMgr = detectPackageManager(resolvedProjectPath);
  const npmRunCmd =
    pkgMgr === "yarn" ? "yarn" : pkgMgr === "pnpm" ? "pnpm run" : "npm run";
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

const PROJECT_URL_REGEXP =
  /studio\.plasmic\.app\/projects\/([a-z0-9]{5,})(\/|$)/i;
const PROJECT_ID_REGEXP = /([a-z0-9]{5,})/i;

export function checkProjectInput(input: string): boolean {
  try {
    extractProjectId(input);
    return true;
  } catch {
    console.warn(`"${input}" is not a valid project URL nor ID.`);
    return false;
  }
}

/** Gets a project ID from an ID itself or a URL. */
export function extractProjectId(input: string): string {
  const matchUrl = input.match(PROJECT_URL_REGEXP);
  if (matchUrl) {
    return matchUrl[1];
  }

  const matchId = input.match(PROJECT_ID_REGEXP);
  if (matchId) {
    return matchId[1];
  }

  throw new Error("run checkProjectInput before extractProjectId");
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
