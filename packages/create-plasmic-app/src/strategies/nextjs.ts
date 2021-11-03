import path from "path";
import { spawnOrFail } from "../utils/cmd-utils";
import { deleteGlob, writeDefaultNextjsConfig } from "../utils/file-utils";
import { installUpgrade } from "../utils/npm-utils";
import { CPAStrategy } from "./types";

const nextjsStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, template, useTypescript } = args;
    const createCommand = `npx -p create-next-app create-next-app ${
      useTypescript ? "--typescript" : ""
    } ${projectPath}`;
    const templateArg = template ? ` --template ${template}` : "";

    // Default Next.js starter already supports Typescript
    // See where we `touch tsconfig.json` later on
    await spawnOrFail(`${createCommand}${templateArg}`);
  },
  configLoader: async (args) => {
    const { projectId, projectPath, projectApiToken, useTypescript } = args;

    const installResult = await installUpgrade("@plasmicapp/loader-nextjs", {
      workingDir: projectPath,
    });

    if (!installResult) {
      throw new Error("Failed to install the Plasmic dependency");
    }

    await writeDefaultNextjsConfig(
      projectPath,
      projectId,
      true,
      projectApiToken,
      useTypescript
    );
  },
  overwriteFiles: async (args) => {
    // this is supposed to be called for loader case, so we are supposed to remove
    // all the files from pages/ since we have inserted a optional catch all
    const { projectPath } = args;

    const pagesPath = path.join(projectPath, "pages");
    deleteGlob(path.join(pagesPath, `*.*`), [
      "[[...catchall]]",
      "plasmic-host",
    ]);
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};

export default nextjsStrategy;
