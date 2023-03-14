import { createReadStream, existsSync, promises as fs } from "fs";
import L from "lodash";
import path from "path";
import * as readline from "readline";
import { spawnOrFail } from "../utils/cmd-utils";
import { installCodegenDeps, runCodegenSync } from "../utils/codegen";
import {
  deleteGlob,
  generateWelcomePage,
  getPlasmicConfig,
  ifTs,
} from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";
import { installUpgrade } from "../utils/npm-utils";
import { CPAStrategy } from "../utils/strategy";
import {
  GATSBY_404,
  GATSBY_PLUGIN_CONFIG,
  GATSBY_SSR_CONFIG,
  makeGatsbyDefaultPage,
  makeGatsbyHostPage,
  makeGatsbyPlasmicInit,
  wrapAppRootForCodegen,
} from "./template";

export const GATSBY_TEMPLATES = {
  js: `https://github.com/gatsbyjs/gatsby-starter-minimal.git`,
  ts: `https://github.com/gatsbyjs/gatsby-starter-minimal-ts.git`,
};

export const gatsbyStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, template, jsOrTs } = args;
    if (template) {
      console.log(
        `Warning: Ignoring template '${template}' (argument is not supported by Gatsby).`
      );
    }
    const gatsbyTemplate = GATSBY_TEMPLATES[jsOrTs];
    const createCommand = `git clone ${gatsbyTemplate} ${projectPath} --recursive --depth 1 --quiet`;
    await spawnOrFail(`${createCommand}`);
    // Remove .git and LICENSE so that we don't generate linked outputs
    await spawnOrFail(`rm -rf ${projectPath}/.git`);
    await spawnOrFail(`rm -rf ${projectPath}/LICENSE`);
  },
  installDeps: async ({ projectPath, scheme, jsOrTs }) => {
    const installedHelmet = await installUpgrade("react-helmet", {
      workingDir: projectPath,
    });
    const installedHelmetTypes =
      jsOrTs === "js" ||
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
    const { projectId, projectPath, projectApiToken, jsOrTs, scheme } = args;
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
        `gatsby-config.${jsOrTs}`
      );
      const rl = readline.createInterface({
        input: createReadStream(gatsbyConfigFile),
        crlfDelay: Infinity,
      });
      // Typescript doesn't accept require.resolve
      // https://www.gatsbyjs.com/docs/how-to/custom-configuration/typescript/#requireresolve
      let result = ifTs(jsOrTs, `import path from "path";\n`);
      const pluginConfig = GATSBY_PLUGIN_CONFIG(
        projectId,
        ensure(projectApiToken),
        jsOrTs
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
    const { projectId, projectApiToken, projectPath, jsOrTs, scheme } = args;

    deleteGlob(path.join(projectPath, "src/@(pages|components|templates)/*.*"));

    // Create a very basic 404 page - `gatsby build` fails without it.
    await fs.writeFile(
      path.join(projectPath, `src/pages/404.${jsOrTs}`),
      GATSBY_404
    );

    // Add plasmic-host page
    await fs.writeFile(
      path.join(projectPath, `src/pages/plasmic-host.${jsOrTs}x`),
      makeGatsbyHostPage({
        jsOrTs,
        scheme,
      })
    );

    // Start with an empty gatsby-node
    await fs.writeFile(path.join(projectPath, `gatsby-node.${jsOrTs}`), "");

    // Updates `gatsby-ssr` to include script tag for preamble
    await fs.writeFile(
      path.join(projectPath, `gatsby-ssr.${jsOrTs}x`),
      GATSBY_SSR_CONFIG
    );

    if (scheme === "loader") {
      await fs.writeFile(
        path.join(projectPath, `src/plasmic-init.${jsOrTs}`),
        makeGatsbyPlasmicInit(jsOrTs)
      );

      const templatesFolder = path.join(projectPath, "src/templates");
      if (!existsSync(templatesFolder)) {
        await fs.mkdir(templatesFolder);
      }
      const defaultPagePath = path.join(
        templatesFolder,
        `defaultPlasmicPage.${jsOrTs}x`
      );
      await fs.writeFile(defaultPagePath, makeGatsbyDefaultPage(jsOrTs));
    } else {
      await runCodegenSync({
        projectId,
        projectApiToken,
        projectPath,
      });

      // Special case: remove all Gatsby components (due to conflicting file names)
      const config = await getPlasmicConfig(projectPath, "gatsby", scheme);
      const plasmicFiles = L.map(
        L.flatMap(config.projects, (p) => p.components),
        (c) => c.importSpec.modulePath
      );
      deleteGlob(path.join(projectPath, "src/@(pages|components)/*.*"), [
        // Files to ignore
        ...plasmicFiles.map((f) => path.basename(f)),
      ]);
      // Create a very basic 404 page - `gatsby build` fails without it.
      // We've deleted the components that the default 404 page depended
      // on, so
      await fs.writeFile(
        path.join(projectPath, `src/pages/404.${jsOrTs}x`),
        GATSBY_404
      );

      // Make an index page if the project didn't have one.
      if (!plasmicFiles.find((f) => f.includes("/index."))) {
        await fs.writeFile(
          path.join(projectPath, `src/pages/index.${jsOrTs}x`),
          generateWelcomePage(config, "gatsby")
        );
      }

      // Overwrite the wrapper files to wrap PlasmicRootProvider
      const wrapperContent = wrapAppRootForCodegen();
      const browserFilePath = path.join(
        projectPath,
        `gatsby-browser.${jsOrTs}x`
      );
      await fs.writeFile(browserFilePath, wrapperContent);

      const ssrFilePath = path.join(projectPath, `gatsby-ssr.${jsOrTs}x`);
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
