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

    /* create-vite package checks if the targetDir doesn't exist then it creates the targetDir in the
      current directory instead of the targetDir path. For example,
      1. Let's say current directory is /tmp/cpa-out
      2. npm create vite@latest /private/tmp/cpa-out/react-codegen-ts will create
      /tmp/cpa-out/private/tmp/cpa-out/react-codegen-ts directory instead of /private/tmp/cpa-out/react-codegen-ts

      To avoid this behaviour, we will ensure the fullProjectPath exists
      1. we get the projectName (react-codegen-ts), and parentDir (/private/tmp/cpa-out)
      2. change directory to parentDir and execute the command with projectName
     */
    const fullProjectPath = path.isAbsolute(projectPath)
      ? projectPath
      : path.resolve(process.cwd(), projectPath);

    await fs.mkdir(fullProjectPath, { recursive: true });

    const projectName = path.basename(fullProjectPath);
    const parentDir = path.dirname(fullProjectPath);
    process.chdir(parentDir);

    const createCommand = `npm create vite@latest ${projectName} --`;

    if (!template) {
      template = jsOrTs === "ts" ? "react-ts" : "react";
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
    const { projectPath, jsOrTs } = args;

    if (jsOrTs === "ts") {
      const tsConfigJsonPath = path.join(projectPath, "tsconfig.app.json");
      let tsConfigJson = await fs.readFile(tsConfigJsonPath, "utf8");

      /* tsconfig.app.json has comments such as /* Bundler mode */ /* Linting */
      /* We need to remove them before parsing the json */
      tsConfigJson = tsConfigJson.replace(/\/\*[\s\S]*?\*\//g, "");
      tsConfigJson = tsConfigJson.replace(/\/\/.*$/gm, "");

      const tsConfig = JSON.parse(tsConfigJson);
      /* In our codegen, we have components where React is imported but not used, we need to
        turn off the `noUnusedLocals` rule to ensure the project builds successfully.
       */
      tsConfig.compilerOptions = {
        ...tsConfig.compilerOptions,
        noUnusedLocals: false,
      };

      await fs.writeFile(tsConfigJsonPath, JSON.stringify(tsConfig, null, 2));
    }
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
      // Delete existing App.tsx and related test
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

    return;
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};
