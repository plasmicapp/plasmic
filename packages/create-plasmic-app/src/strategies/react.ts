import { spawnOrFail } from "../utils/cmd-utils";
import { installUpgrade } from "../utils/npm-utils";
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
  configLoader: async (args) => {
    // this is unreachable for now, but should we have it ??
    const { projectPath } = args;

    const installResult = await installUpgrade("@plasmicapp/loader-react", {
      workingDir: projectPath,
    });

    if (!installResult) {
      throw new Error("Failed to install the Plasmic dependency");
    }
  },
  overwriteFiles: async () => {
    return;
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};

export default reactStrategy;
