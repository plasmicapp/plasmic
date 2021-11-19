import { spawnOrFail } from "../utils/cmd-utils";
import { overwriteIndex } from "../utils/file-utils";
import { installUpgrade } from "../utils/npm-utils";
import { installCodegenDeps, runCodegenSync } from "./common";
import { CPAStrategy } from "./types";

const reactStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, useTypescript } = args;
    let { template } = args;
    const createCommand = `npx -p create-react-app create-react-app ${projectPath}`;

    if (!template && useTypescript) {
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
  }) => {
    if (scheme === "loader") {
      // Nothing to do
    } else {
      await runCodegenSync({
        projectId,
        projectApiToken,
        projectPath,
      });

      // Overwrite the index file
      await overwriteIndex(projectPath, "react", scheme);
    }
    return;
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};

export default reactStrategy;
