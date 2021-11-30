import { promises as fs } from "fs";
import path from "path";
import {
  makeNextjsCatchallPage,
  makeNextjsHostPage,
  makeNextjsInitPage,
  wrapAppRootForCodegen,
} from "../templates/nextjs";
import { spawnOrFail } from "../utils/cmd-utils";
import { deleteGlob, overwriteIndex } from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";
import { installUpgrade } from "../utils/npm-utils";
import { installCodegenDeps, runCodegenSync } from "./common";
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
  installDeps: async ({ scheme, projectPath }) => {
    if (scheme === "loader") {
      return await installUpgrade("@plasmicapp/loader-nextjs", {
        workingDir: projectPath,
      });
    } else {
      return await installCodegenDeps({ projectPath });
    }
  },
  overwriteConfig: async (args) => {
    const { projectPath, scheme } = args;

    if (scheme === "codegen") {
      const nextjsConfigFile = path.join(projectPath, "next.config.js");
      await fs.writeFile(
        nextjsConfigFile,
        `
module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: true,
  // Your NextJS config.
};
    `
      );
    }
  },
  generateFiles: async (args) => {
    // this is supposed to be called for loader case, so we are supposed to remove
    // all the files from pages/ since we have inserted a optional catch all
    const {
      projectPath,
      scheme,
      useTypescript,
      projectId,
      projectApiToken,
    } = args;

    // Always start fresh
    const pagesPath = path.join(projectPath, "pages");
    deleteGlob(path.join(pagesPath, `*.*`));

    const hostPage = path.join(
      pagesPath,
      `plasmic-host.${useTypescript ? "tsx" : "jsx"}`
    );
    await fs.writeFile(hostPage, makeNextjsHostPage(scheme));

    if (scheme === "loader") {
      const initFile = path.join(
        projectPath,
        `plasmic-init.${useTypescript ? "ts" : "js"}`
      );
      await fs.writeFile(
        initFile,
        makeNextjsInitPage(projectId, ensure(projectApiToken))
      );

      // Write catch-all page for loader
      const loaderPage = path.join(
        pagesPath,
        `[[...catchall]].${useTypescript ? "tsx" : "jsx"}`
      );
      await fs.writeFile(
        loaderPage,
        makeNextjsCatchallPage(useTypescript ? "ts" : "js")
      );
    } else {
      await runCodegenSync({
        projectId,
        projectApiToken,
        projectPath,
      });

      // Overwrite the index file
      await overwriteIndex(projectPath, "nextjs", scheme);

      // Overwrite the wrapper files to wrap PlasmicRootProvider
      const appFilePath = path.join(projectPath, "pages", `_app.js`);
      await fs.writeFile(appFilePath, wrapAppRootForCodegen());
    }
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};

export default nextjsStrategy;
