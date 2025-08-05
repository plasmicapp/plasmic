import { promises as fs } from "fs";
import path from "path";
import { spawnOrFail } from "../utils/cmd-utils";
import { installCodegenDeps, runCodegenSync } from "../utils/codegen";
import { deleteGlob } from "../utils/file-utils";
import { CPAStrategy, GenerateFilesArgs } from "../utils/strategy";
import { makeCustomViteConfig_file_router_codegen } from "./templates/file-router/config";
import { makePlasmicHostPage_fileRouter_codegen } from "./templates/file-router/plasmic-host";
import { makeCustomRoot_file_router_codegen } from "./templates/file-router/root";

export const tanstackStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath } = args;

    /* create-tsrouter-app package receives the projectName as an argument, when we provide a fullProjectPath, it creates
    package.json with name having the fullProjectPath causing illegal characters in the name field error.

      To avoid this behaviour, we will ensure the fullProjectPath exists
      1. we get the projectName (tanstack-codegen-ts), and parentDir (/private/tmp/cpa-out)
      2. change directory to parentDir and execute the command with projectName
     */
    const fullProjectPath = path.isAbsolute(projectPath)
      ? projectPath
      : path.resolve(process.cwd(), projectPath);

    await fs.mkdir(fullProjectPath, { recursive: true });

    const projectName = path.basename(fullProjectPath);
    const parentDir = path.dirname(fullProjectPath);
    process.chdir(parentDir);

    const createCommand = `npx create-tsrouter-app@latest ${projectName} --template file-router --add-ons start`;

    await spawnOrFail(createCommand);
  },
  installDeps: async ({ scheme, projectPath }) => {
    if (scheme === "loader") {
      throw new Error(
        "Plasmic loader scheme is not supported for TanStack platform. Please use the codegen scheme instead."
      );
    } else {
      return await installCodegenDeps({ projectPath });
    }
  },
  overwriteConfig: async (args) => {
    const { projectPath } = args;

    /* We need to provide @plasmicapp/* packages in noExternal ssr packages for
     * them to work properly during ssr phase.
     */
    await fs.writeFile(
      path.join(projectPath, "vite.config.ts"),
      makeCustomViteConfig_file_router_codegen()
    );

    // Disable verbatimModuleSyntax in tsconfig.json
    const tsconfigPath = path.join(projectPath, "tsconfig.json");
    const tsconfigContent = await fs.readFile(tsconfigPath, "utf8");
    await fs.writeFile(
      tsconfigPath,
      tsconfigContent.replace(
        `"verbatimModuleSyntax": true`,
        `"verbatimModuleSyntax": false`
      )
    );
  },
  generateFiles: (args) => {
    return generateFilesFileRouterTemplate(args);
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};

async function generateFilesFileRouterTemplate(args: GenerateFilesArgs) {
  const { projectPath, scheme, projectId, projectApiToken } = args;

  // Delete existing pages
  deleteGlob(path.join(projectPath, "src/routes", "*.*"));

  if (scheme === "loader") {
    throw new Error(
      "Plasmic loader scheme is not supported for TanStack platform. Please use the codegen scheme instead."
    );
  } else {
    // ./src/routes/__root.tsx
    await fs.writeFile(
      path.join(projectPath, "src/routes", "__root.tsx"),
      makeCustomRoot_file_router_codegen()
    );

    // ./src/routes/plasmic-host.tsx
    await fs.writeFile(
      path.join(projectPath, "src/routes", "plasmic-host.tsx"),
      makePlasmicHostPage_fileRouter_codegen()
    );

    // This should generate
    // ./plasmic.json
    // ./routes/index.tsx
    // ./components/plasmic/**
    await runCodegenSync({
      projectId,
      projectApiToken,
      projectPath,
    });
  }
}
