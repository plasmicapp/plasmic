import { createReadStream, existsSync, promises as fs } from "fs";
import path from "path";
import * as readline from "readline";
import {
  GATSBY_404,
  GATSBY_DEFAULT_PAGE,
  GATSBY_PLUGIN_CONFIG,
} from "../templates/gatsby";
import { spawnOrFail } from "../utils/cmd-utils";
import { deleteGlob } from "../utils/file-utils";
import { installUpgrade } from "../utils/npm-utils";
import { CPAStrategy } from "./types";

const gatsbyStrategy: CPAStrategy = {
  create: async (args) => {
    const { projectPath, template } = args;
    const createCommand = `npx -p gatsby gatsby new ${projectPath}`;
    const templateArg = template ? ` ${template}` : "";

    // Default Gatsby starter already supports Typescript
    // See where we `touch tsconfig.json` later on
    await spawnOrFail(`${createCommand}${templateArg}`);
  },
  configLoader: async (args) => {
    const { projectId, projectPath, projectApiToken } = args;

    const installResult = await installUpgrade("@plasmicapp/loader-gatsby", {
      workingDir: projectPath,
    });

    if (!installResult) {
      throw new Error("Failed to install the Plasmic dependency");
    }

    // create-gatsby will create a default gatsby-config.js that we need to modify
    const gatsbyConfigFile = path.join(projectPath, "gatsby-config.js");
    const rl = readline.createInterface({
      input: createReadStream(gatsbyConfigFile),
      crlfDelay: Infinity,
    });
    let result = "";
    for await (const line of rl) {
      result += line + "\n";
      // Prepend PlasmicLoader to list of plugins
      if (line.includes("plugins:")) {
        result += GATSBY_PLUGIN_CONFIG(projectId, projectApiToken);
      }
    }
    await fs.writeFile(gatsbyConfigFile, result);
  },
  overwriteFiles: async (args) => {
    // in gatsby we can delete all existing pages/components, since all pages are going
    // to be handled by templates/defaultPlasmicPage
    const { projectPath } = args;

    deleteGlob(path.join(projectPath, "src/@(pages|components|templates)/*.*"));

    // Create a very basic 404 page - `gatsby build` fails without it.
    // We've deleted the components that the default 404 page depended
    // on, so
    await fs.writeFile(path.join(projectPath, "src/pages/404.js"), GATSBY_404);

    // Start with an empty gatsby-node.js
    await fs.writeFile(path.join(projectPath, "gatsby-node.js"), "");

    const templatesFolder = path.join(projectPath, "src/templates");
    const defaultPagePath = path.join(templatesFolder, "defaultPlasmicPage.js");

    if (!existsSync(templatesFolder)) {
      await fs.mkdir(templatesFolder);
    }
    await fs.writeFile(defaultPagePath, GATSBY_DEFAULT_PAGE);
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
