import { promises as fs } from "fs";
import path from "path";
import { spawnOrFail } from "../utils/cmd-utils";
import { installCodegenDeps, runCodegenSync } from "../utils/codegen";
import { deleteGlob, overwriteIndex } from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";
import { installUpgrade } from "../utils/npm-utils";
import { CPAStrategy, GenerateFilesArgs } from "../utils/strategy";
import {
  makeNextjsCatchallPage,
  makeNextjsHostPage,
  makeNextjsInitPage,
  wrapAppRootForCodegen,
} from "./template";
import { makeNextjsAppDirCatchallPage } from "./templates/loader-app/catchall-page";
import { makeNextjsAppDirPlasmicHostPage } from "./templates/loader-app/plasmic-host";
import { makeNextjsAppDirPlasmicInit } from "./templates/loader-app/plasmic-init";
import { makeNextjsAppDirPlasmicInitClient } from "./templates/loader-app/plasmic-init-client";

export const nextjsStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, template, jsOrTs, platformOptions } = args;
    const typescriptArg = `--${jsOrTs}`;
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

async function generateFilesAppDir(args: GenerateFilesArgs) {
  const { projectPath, jsOrTs, projectId, projectApiToken } = args;

  // Always start fresh
  const appPath = path.join(projectPath, "app");
  deleteGlob(path.join(appPath, "page.*"));

  const initFile = path.join(projectPath, `plasmic-init.${jsOrTs}`);
  await fs.writeFile(
    initFile,
    makeNextjsAppDirPlasmicInit(projectId, ensure(projectApiToken))
  );

  const initClientFile = path.join(
    projectPath,
    `plasmic-init-client.${jsOrTs}x`
  );
  await fs.writeFile(initClientFile, makeNextjsAppDirPlasmicInitClient(jsOrTs));

  const hostPage = path.join(
    appPath,
    "plasmic-host",
    `page.${jsOrTs}x`
  );
  await fs.mkdir(path.join(appPath, "plasmic-host"));
  await fs.writeFile(hostPage, makeNextjsAppDirPlasmicHostPage());

  // Write catch-all page for loader
  const loaderPage = path.join(appPath, "[[...catchall]]", `page.${jsOrTs}x`);
  await fs.mkdir(path.join(appPath, "[[...catchall]]"));
  await fs.writeFile(loaderPage, makeNextjsAppDirCatchallPage(jsOrTs));
}

async function generateFilesPagesDir(args: GenerateFilesArgs) {
  const { projectPath, scheme, jsOrTs, projectId, projectApiToken } = args;

  // this is supposed to be called for loader case, so we are supposed to remove
  // all the files from pages/ since we have inserted a optional catch all
  // Always start fresh
  const pagesPath = path.join(projectPath, "pages");
  deleteGlob(path.join(pagesPath, `*.*`));

  const hostPage = path.join(pagesPath, `plasmic-host.${jsOrTs}x`);
  await fs.writeFile(hostPage, makeNextjsHostPage(scheme));

  if (scheme === "loader") {
    const initFile = path.join(projectPath, `plasmic-init.${jsOrTs}`);
    await fs.writeFile(
      initFile,
      makeNextjsInitPage(projectId, ensure(projectApiToken))
    );

    // Write catch-all page for loader
    const loaderPage = path.join(pagesPath, `[[...catchall]].${jsOrTs}x`);
    await fs.writeFile(loaderPage, makeNextjsCatchallPage(jsOrTs));
  } else {
    await runCodegenSync({
      projectId,
      projectApiToken,
      projectPath,
    });

    // Overwrite the index file
    await overwriteIndex(projectPath, "nextjs", scheme);

    // Overwrite the wrapper files to wrap PlasmicRootProvider
    const appFilePath = path.join(projectPath, "pages", `_app.${jsOrTs}x`);
    await fs.writeFile(appFilePath, wrapAppRootForCodegen(jsOrTs));
  }
}
