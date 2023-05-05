import { promises as fs } from "fs";
import L from "lodash";
import path from "path";
import { spawnOrFail } from "../utils/cmd-utils";
import { installCodegenDeps, runCodegenSync } from "../utils/codegen";
import {
  deleteGlob,
  generateWelcomePage,
  getPlasmicConfig,
} from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";
import { installUpgrade } from "../utils/npm-utils";
import { CPAStrategy, GenerateFilesArgs } from "../utils/strategy";
import { makeCatchallPage_app_loader } from "./templates/app-loader/catchall-page";
import { makePlasmicHostPage_app_loader } from "./templates/app-loader/plasmic-host";
import { makePlasmicInit_app_loader } from "./templates/app-loader/plasmic-init";
import { makePlasmicInitClient_app_loader } from "./templates/app-loader/plasmic-init-client";
import { makeCustomApp_pages_codegen } from "./templates/pages-codegen/app";
import { makePlasmicHostPage_pages_codegen } from "./templates/pages-codegen/plasmic-host";
import { makeCatchallPage_pages_loader } from "./templates/pages-loader/catchall-page";
import { makePlasmicHostPage_pages_loader } from "./templates/pages-loader/plasmic-host";
import { makePlasmicInit_pages_loader } from "./templates/pages-loader/plasmic-init";

export const nextjsStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, template, jsOrTs, platformOptions } = args;
    const typescriptArg = `--${jsOrTs}`;
    const experimentalAppArg = platformOptions.nextjs?.appDir
      ? "--app"
      : "--no-app";
    const templateArg = template ? ` --template ${template}` : "";
    const createCommand =
      `npx create-next-app@latest ${projectPath} ${typescriptArg} ${experimentalAppArg} ${templateArg}` +
      ` --eslint --no-src-dir  --import-alias "@/*" --no-tailwind`;

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

  // Delete existing pages
  deleteGlob(path.join(projectPath, "app", "page.*"));

  // ./plasmic-init.ts
  await fs.writeFile(
    path.join(projectPath, `plasmic-init.${jsOrTs}`),
    makePlasmicInit_app_loader(projectId, ensure(projectApiToken))
  );

  // ./plasmic-init-client.ts
  await fs.writeFile(
    path.join(projectPath, `plasmic-init-client.${jsOrTs}x`),
    makePlasmicInitClient_app_loader(jsOrTs)
  );

  // ./app/plasmic-host/page.tsx
  await fs.mkdir(path.join(projectPath, "app", "plasmic-host"));
  await fs.writeFile(
    path.join(projectPath, "app", "plasmic-host", `page.${jsOrTs}x`),
    makePlasmicHostPage_app_loader()
  );

  // ./app/[[...catchall]]/page.tsx
  await fs.mkdir(path.join(projectPath, "app", "[[...catchall]]"));
  await fs.writeFile(
    path.join(projectPath, "app", "[[...catchall]]", `page.${jsOrTs}x`),
    makeCatchallPage_app_loader(jsOrTs)
  );
}

async function generateFilesPagesDir(args: GenerateFilesArgs) {
  const { projectPath, scheme, jsOrTs, projectId, projectApiToken } = args;

  // Delete existing pages
  deleteGlob(path.join(projectPath, "pages", "*.*"));

  if (scheme === "loader") {
    // ./plasmic-init.ts
    await fs.writeFile(
      path.join(projectPath, `plasmic-init.${jsOrTs}`),
      makePlasmicInit_pages_loader(projectId, ensure(projectApiToken))
    );

    // ./pages/plasmic-host.tsx
    await fs.writeFile(
      path.join(projectPath, "pages", `plasmic-host.${jsOrTs}x`),
      makePlasmicHostPage_pages_loader()
    );

    // ./pages/[[...catchall]].tsx
    await fs.writeFile(
      path.join(projectPath, "pages", `[[...catchall]].${jsOrTs}x`),
      makeCatchallPage_pages_loader(jsOrTs)
    );
  } else {
    // ./pages/_app.tsx
    await fs.writeFile(
      path.join(projectPath, "pages", `_app.${jsOrTs}x`),
      makeCustomApp_pages_codegen(jsOrTs)
    );

    // ./pages/plasmic-host.tsx
    await fs.writeFile(
      path.join(projectPath, "pages", `plasmic-host.${jsOrTs}x`),
      makePlasmicHostPage_pages_codegen()
    );

    // This should generate
    // ./plasmic.json
    // ./pages/index.tsx
    // ./components/plasmic/**
    await runCodegenSync({
      projectId,
      projectApiToken,
      projectPath,
    });

    // Make an index page if the project didn't have one.
    const config = await getPlasmicConfig(projectPath, "nextjs", scheme);
    const plasmicFiles = L.map(
      L.flatMap(config.projects, (p) => p.components),
      (c) => c.importSpec.modulePath
    );
    if (!plasmicFiles.find((f) => f.includes("/index."))) {
      await fs.writeFile(
        path.join(projectPath, "pages", `index.${jsOrTs}x`),
        generateWelcomePage(config, "nextjs")
      );
    }
  }
}
