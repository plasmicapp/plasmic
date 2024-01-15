import { promises as fs } from "fs";
import glob from "glob";
import path from "path";
import { spawnOrFail } from "../utils/cmd-utils";
import { installCodegenDeps, runCodegenSync } from "../utils/codegen";
import {
  deleteGlob,
  generateHomePage,
  generateWelcomePage,
  getPlasmicConfig,
} from "../utils/file-utils";
import { installUpgrade } from "../utils/npm-utils";
import { CPAStrategy } from "../utils/strategy";

export const reactStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, jsOrTs } = args;
    let { template } = args;
    const createCommand = `npx create-react-app@latest ${projectPath}`;

    if (!template && jsOrTs === "ts") {
      template = "typescript";
    }

    const templateArg = template ? ` --template ${template}` : "";
    await spawnOrFail(`${createCommand}${templateArg}`);
  },
  installDeps: async ({ projectPath, scheme }) => {
    if (scheme === "loader") {
      return await installUpgrade("@plasmicapp/loader-react", {
        workingDir: projectPath,
      });
    } else {
      return await installCodegenDeps({ projectPath });
    }
  },
  overwriteConfig: async (args) => {
    // No config to overwrite
  },
  generateFiles: async ({
    scheme,
    projectApiToken,
    projectId,
    projectPath,
    jsOrTs,
  }) => {
    if (scheme === "loader") {
      // Nothing to do
    } else {
      // Delete existing entry point App.tsx and related test
      deleteGlob(path.join(projectPath, "src", "App*"));

      await runCodegenSync({
        projectId,
        projectApiToken,
        projectPath,
      });

      // Pick a page for the entry point App.tsx page
      const config = await getPlasmicConfig(projectPath, "react", scheme);
      const pagesDir = path.join(projectPath, config.srcDir);
      const projectConfig = config.projects.find(
        (p) => p.projectId === projectId
      );
      const globalContextsPath =
        projectConfig &&
        projectConfig.globalContextsFilePath &&
        config.wrapPagesWithGlobalContexts
          ? path.join(
              projectPath,
              config.srcDir,
              projectConfig.globalContextsFilePath
            )
          : undefined;
      const homeFilePossibilities = glob.sync(
        path.join(pagesDir, "**", "@(index|Home|home|Homepage).*")
      );

      // Overwrite App.tsx
      const indexPath = path.join(projectPath, "src", `App.${jsOrTs}x`);
      const content =
        homeFilePossibilities.length > 0
          ? generateHomePage(
              homeFilePossibilities[0],
              indexPath,
              globalContextsPath
            )
          : generateWelcomePage(config, "react");
      await fs.writeFile(indexPath, content);
    }

    // Deactivate React.StrictMode from index.js or index.tsx
    const indexFileName = path.join(
      projectPath,
      "src",
      `index.${jsOrTs === "js" ? "js" : "tsx"}`
    );
    let indexFile = (await fs.readFile(indexFileName)).toString();
    indexFile = indexFile.replace("<React.StrictMode>", "");
    indexFile = indexFile.replace("</React.StrictMode>", "");
    await fs.writeFile(indexFileName, indexFile);

    return;
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};
