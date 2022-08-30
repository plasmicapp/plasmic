import { createReadStream, existsSync, promises as fs } from "fs";
import path from "path";
import * as readline from "readline";
import {
  GATSBY_404,
  GATSBY_PLUGIN_CONFIG,
  GATSBY_SSR_CONFIG,
  makeGatsbyDefaultPage,
  makeGatsbyHostPage,
  makeGatsbyPlasmicInit,
  wrapAppRootForCodegen,
} from "../templates/gatsby";
import { spawnOrFail } from "../utils/cmd-utils";
import { deleteGlob, overwriteIndex } from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";
import { installUpgrade } from "../utils/npm-utils";
import { installCodegenDeps, runCodegenSync } from "./common";
import { CPAStrategy } from "./types";

export const GATSBY_TEMPLATES = {
  js: `https://github.com/gatsbyjs/gatsby-starter-minimal.git`,
  ts: `https://github.com/gatsbyjs/gatsby-starter-minimal-ts.git`,
};

const gatsbyStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, template, useTypescript } = args;
    if (template) {
      console.log(
        `Warning: Ignoring template '${template}' (argument is not supported by Gatsby).`
      );
    }
    const gatsbyTemplate = GATSBY_TEMPLATES[useTypescript ? "ts" : "js"];
    const createCommand = `git clone ${gatsbyTemplate} ${projectPath} --recursive --depth 1 --quiet`;
    await spawnOrFail(`${createCommand}`);
    // Remove .git and LICENSE so that we don't generate linked outputs
    await spawnOrFail(`rm -rf ${projectPath}/.git`);
    await spawnOrFail(`rm -rf ${projectPath}/LICENSE`);
  },
  installDeps: async ({ projectPath, scheme, useTypescript }) => {
    const installedHelmet = await installUpgrade("react-helmet", {
      workingDir: projectPath,
    });
    const installedHelmetTypes =
      !useTypescript ||
      (await installUpgrade("@types/react-helmet", {
        workingDir: projectPath,
        dev: true,
      }));
    const installedHelmetPlugin = await installUpgrade(
      "gatsby-plugin-react-helmet",
      {
        workingDir: projectPath,
      }
    );
    if (!installedHelmet || !installedHelmetPlugin || !installedHelmetTypes) {
      return false;
    }

    if (scheme === "loader") {
      return await installUpgrade("@plasmicapp/loader-gatsby", {
        workingDir: projectPath,
      });
    } else {
      return await installCodegenDeps({ projectPath });
    }
  },
  overwriteConfig: async (args) => {
    const {
      projectId,
      projectPath,
      projectApiToken,
      useTypescript,
      scheme,
    } = args;
    const extension = useTypescript ? "ts" : "js";

    const packageName = path.basename(projectPath);

    // Update package.json: adding name and description, removing license and author
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = await fs.readFile(packageJsonPath, "utf8");
    const packageJsonObject = JSON.parse(packageJson);
    packageJsonObject.name = packageName;
    packageJsonObject.description = `Plasmic app for ${projectId}`;
    delete packageJsonObject.license;
    delete packageJsonObject.author;
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJsonObject, null, 2)
    );

    if (scheme === "loader") {
      // create-gatsby will create a default gatsby-config that we need to modify
      const gatsbyConfigFile = path.join(
        projectPath,
        `gatsby-config.${extension}`
      );
      const rl = readline.createInterface({
        input: createReadStream(gatsbyConfigFile),
        crlfDelay: Infinity,
      });
      // Typescript doesn't accept require.resolve
      // https://www.gatsbyjs.com/docs/how-to/custom-configuration/typescript/#requireresolve
      let result = useTypescript ? `import path from "path";\n` : "";
      const pluginConfig = GATSBY_PLUGIN_CONFIG(
        projectId,
        ensure(projectApiToken),
        useTypescript
      );
      for await (const line of rl) {
        if (line.includes("plugins: []")) {
          result += "  plugins: [" + pluginConfig + "]\n";
        } else if (line.includes("plugins: [")) {
          result += line + pluginConfig + "\n";
        } else {
          result += line + "\n";
        }
      }
      await fs.writeFile(gatsbyConfigFile, result);
    }
  },
  generateFiles: async (args) => {
    // in gatsby we can delete all existing pages/components, since all pages are going
    // to be handled by templates/defaultPlasmicPage
    const {
      projectId,
      projectApiToken,
      projectPath,
      useTypescript,
      scheme,
    } = args;

    const extension = useTypescript ? "ts" : "js";

    deleteGlob(path.join(projectPath, "src/@(pages|components|templates)/*.*"));

    // Create a very basic 404 page - `gatsby build` fails without it.
    await fs.writeFile(
      path.join(projectPath, `src/pages/404.${extension}`),
      GATSBY_404
    );

    // Add plasmic-host page
    await fs.writeFile(
      path.join(projectPath, `src/pages/plasmic-host.${extension}x`),
      makeGatsbyHostPage({
        useTypescript,
        scheme,
      })
    );

    // Start with an empty gatsby-node
    await fs.writeFile(path.join(projectPath, `gatsby-node.${extension}`), "");

    // Updates `gatsby-ssr` to include script tag for preamble
    await fs.writeFile(
      path.join(projectPath, `gatsby-ssr.${extension}x`),
      GATSBY_SSR_CONFIG
    );

    if (scheme === "loader") {
      await fs.writeFile(
        path.join(projectPath, `src/plasmic-init.${extension}`),
        makeGatsbyPlasmicInit(extension)
      );

      const templatesFolder = path.join(projectPath, "src/templates");
      if (!existsSync(templatesFolder)) {
        await fs.mkdir(templatesFolder);
      }
      const defaultPagePath = path.join(
        templatesFolder,
        `defaultPlasmicPage.${extension}x`
      );
      await fs.writeFile(defaultPagePath, makeGatsbyDefaultPage(extension));
    } else {
      await runCodegenSync({
        projectId,
        projectApiToken,
        projectPath,
      });

      // Overwrite the index file
      await overwriteIndex(projectPath, "gatsby", scheme);

      // Overwrite the wrapper files to wrap PlasmicRootProvider
      const wrapperContent = wrapAppRootForCodegen();
      const browserFilePath = path.join(
        projectPath,
        `gatsby-browser.${extension}x`
      );
      await fs.writeFile(browserFilePath, wrapperContent);

      const ssrFilePath = path.join(projectPath, `gatsby-ssr.${extension}x`);
      await fs.writeFile(ssrFilePath, wrapperContent);
    }
  },
  build: async (args) => {
    const { npmRunCmd, projectPath } = args;
    // A recurrent problem is `Something went wrong installing the "sharp" module`
    // https://github.com/gatsbyjs/gatsby/issues/20957
    // This may be a local problem for each person, but maybe we can try to handle it
    // here
    await spawnOrFail(`${npmRunCmd} build`, projectPath);
  },
};

export default gatsbyStrategy;
