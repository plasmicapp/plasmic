import { promises as fs } from "fs";
import path from "path";
import { spawnOrFail } from "../utils/cmd-utils";
import { installCodegenDeps, runCodegenSync } from "../utils/codegen";
import { deleteGlob } from "../utils/file-utils";
import { CPAStrategy, GenerateFilesArgs } from "../utils/strategy";
import { makeCustomAppConfig_file_router_codegen } from "./templates/file-router/config";
import { makePlasmicHostPage_fileRouter_codegen } from "./templates/file-router/plasmic-host";
import { makeCustomRoot_file_router_codegen } from "./templates/file-router/root";

export const tanstackStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath } = args;
    const createCommand = `npx create-tsrouter-app@latest ${projectPath} --template file-router --add-ons start`;

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
    const { projectPath, jsOrTs } = args;

    /* We need to provide @plasmicapp/* packages in noExternal ssr packages for
     * them to work properly during ssr phase.
     */
    if (jsOrTs === "ts") {
      await fs.writeFile(
        path.join(projectPath, "app.config.ts"),
        makeCustomAppConfig_file_router_codegen()
      );
    }
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
  const { projectPath, scheme, jsOrTs, projectId, projectApiToken } = args;

  // Delete existing pages
  deleteGlob(path.join(projectPath, "src/routes", "*.*"));

  if (scheme === "loader") {
    throw new Error(
      "Plasmic loader scheme is not supported for TanStack platform. Please use the codegen scheme instead."
    );
  } else {
    // ./src/routes/__root.tsx
    await fs.writeFile(
      path.join(projectPath, "src/routes", `__root.${jsOrTs}x`),
      makeCustomRoot_file_router_codegen(jsOrTs)
    );

    // ./src/routes/plasmic-host.tsx
    await fs.writeFile(
      path.join(projectPath, "src/routes", `plasmic-host.${jsOrTs}x`),
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
