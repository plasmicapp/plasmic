import { promises as fs } from "fs";
import path from "path";
import {
  makeNextjsCatchallPage,
  makeNextjsHostPage,
  makeNextjsInitPage,
  wrapAppRootForCodegen,
} from "../templates/nextjs";
import { makeNextjsAppDirCatchallPage } from "../templates/nextjs/loader-app/catchall-page";
import { makeNextjsAppDirPlasmicHostPage } from "../templates/nextjs/loader-app/plasmic-host";
import { makeNextjsAppDirPlasmicInit } from "../templates/nextjs/loader-app/plasmic-init";
import { makeNextjsAppDirPlasmicInitClient } from "../templates/nextjs/loader-app/plasmic-init-client";
import { spawnOrFail } from "../utils/cmd-utils";
import { deleteGlob, overwriteIndex } from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";
import { installUpgrade } from "../utils/npm-utils";
import { installCodegenDeps, runCodegenSync } from "./common";
import { CPAStrategy, GenerateFilesArgs } from "./types";

const nextjsStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, template, useTypescript, platformOptions } = args;
    const typescriptArg = useTypescript ? "--ts" : "--js";
    const experimentalAppArg = platformOptions.nextjs?.appDir
      ? "--experimental-app"
      : "--no-experimental-app";
    const templateArg = template ? ` --template ${template}` : "";
    const createCommand =
      `npx create-next-app@latest ${typescriptArg} ${experimentalAppArg} ${templateArg}` +
      ` --eslint --no-src-dir  --import-alias "@/*" ${projectPath}`;

    // Default Next.js starter already supports Typescript
    // See where we `touch tsconfig.json` later on
    await spawnOrFail(createCommand);
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
    const { projectPath, scheme, platformOptions } = args;
    const nextjsConfigFile = path.join(projectPath, "next.config.js");
    const appDirOption = platformOptions.nextjs?.appDir
      ? `
  experimental: {
    appDir: true,
  }`
      : "";
    if (scheme === "codegen") {
      await fs.writeFile(
        nextjsConfigFile,
        `
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: true,${appDirOption}
};

module.exports = nextConfig;`
      );
    } else {
      await fs.writeFile(
        nextjsConfigFile,
        `
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turn off React StrictMode for now, as react-aria (used by Plasmic)
  // has some troubles with it. See
  // https://github.com/adobe/react-spectrum/labels/strict%20mode
  reactStrictMode: false,${appDirOption}
};

module.exports = nextConfig;`
      );
    }
  },
  generateFiles: (args) => {
    if (args.platformOptions.nextjs?.appDir) {
      return generateFilesAppDir(args);
    } else {
      return generateFilesPagesDir(args);
    }
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};

export default nextjsStrategy;

async function generateFilesAppDir(args: GenerateFilesArgs) {
  const { projectPath, useTypescript, projectId, projectApiToken } = args;

  // Always start fresh
  const appPath = path.join(projectPath, "app");
  deleteGlob(path.join(appPath, "page.*"));

  const initFile = path.join(
    projectPath,
    `plasmic-init.${useTypescript ? "ts" : "js"}`
  );
  await fs.writeFile(
    initFile,
    makeNextjsAppDirPlasmicInit(projectId, ensure(projectApiToken))
  );

  const initClientFile = path.join(
    projectPath,
    `plasmic-init-client.${useTypescript ? "tsx" : "jsx"}`
  );
  await fs.writeFile(
    initClientFile,
    makeNextjsAppDirPlasmicInitClient(useTypescript)
  );

  const hostPage = path.join(
    appPath,
    "plasmic-host",
    `page.${useTypescript ? "tsx" : "jsx"}`
  );
  await fs.mkdir(path.join(appPath, "plasmic-host"));
  await fs.writeFile(hostPage, makeNextjsAppDirPlasmicHostPage());

  // Write catch-all page for loader
  const loaderPage = path.join(
    appPath,
    "[[...catchall]]",
    `page.${useTypescript ? "tsx" : "jsx"}`
  );
  await fs.mkdir(path.join(appPath, "[[...catchall]]"));
  await fs.writeFile(loaderPage, makeNextjsAppDirCatchallPage(useTypescript));
}

async function generateFilesPagesDir(args: GenerateFilesArgs) {
  const {
    projectPath,
    scheme,
    useTypescript,
    projectId,
    projectApiToken,
  } = args;

  // this is supposed to be called for loader case, so we are supposed to remove
  // all the files from pages/ since we have inserted a optional catch all
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
}
