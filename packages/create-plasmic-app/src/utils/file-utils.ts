import { createReadStream } from "fs";
import * as fs from "fs/promises";
import glob from "glob";
import * as path from "path";
import * as readline from "readline";
import { ensure, ensureString } from "./lang-utils";

/**
 * create-next-app doesn't create next.config.js,
 * so it's safe to just write the file
 * @param absPath
 * @param projectId
 * @returns
 */
export async function writeDefaultNextjsConfig(
  projectDir: string,
  projectId: string
): Promise<void> {
  const nextjsConfigFile = path.join(projectDir, "next.config.js");
  await fs.writeFile(
    nextjsConfigFile,
    `
const plasmic = require('@plasmicapp/loader/next');
const withPlasmic = plasmic({
  projects: ['${projectId}'] // An array of project ids.
});
module.exports = withPlasmic({
  // Your NextJS config.
});
  `
  );
}

/**
 * create-gatsby will create a default gatsby-config.js that we need to modify
 * @param absPath
 * @param projectId
 * @returns
 */
export async function modifyDefaultGatsbyConfig(
  projectDir: string,
  projectId: string
): Promise<void> {
  const gatsbyConfigFile = path.join(projectDir, "gatsby-config.js");
  const rl = readline.createInterface({
    input: createReadStream(gatsbyConfigFile),
    crlfDelay: Infinity,
  });
  let result = "";
  for await (const line of rl) {
    result += line + "\n";
    // Prepend PlasmicLoader to list of plugins
    if (line.includes("plugins:")) {
      result +=
        `
    {
      resolve: "@plasmicapp/loader/gatsby",
      options: {
        projects: ["${projectId}"], // An array of project ids.
      },
    },` + "\n";
    }
  }
  await fs.writeFile(gatsbyConfigFile, result);
}

/**
 * Replace the contents of App.js with rendering a Plasmic component,
 * assuming that you're using codegen and the files can be found on the filesystem.
 * @param projectDir - the absolute path to the project
 */
export async function writeDefaultCraAppjs(projectDir: string): Promise<void> {
  // The source directory of the project (assume `src/`)
  const srcDir = path.join(projectDir, "src");
  // The absolute path to App.js
  const appjsFile = ensure(
    glob.sync(path.join(srcDir, "**", "App.?(j|t)s"))[0]
  );
  // The absolute path to the Plasmic component
  const component = await getPlasmicComponent(projectDir);
  // The relative import path from App.js to the Plasmic component
  const componentRelativePath = path.relative(
    path.dirname(appjsFile),
    component.absPath
  );
  const appjsContents = `
import ${component.name} from './${componentRelativePath}';

function App() {
  return (<${component.name} />);
}

export default App;
  `;
  await fs.writeFile(appjsFile, appjsContents);
}

/**
 * Get the Plasmic component to render
 * @param projectDir
 * @returns
 */
async function getPlasmicComponent(
  projectDir: string
): Promise<{
  absPath: string; // Absolute path
  filename: string; // Basename of the file
  name: string; // Component name
}> {
  const absPath = await getPlasmicComponentFile(projectDir);
  const filename = path.basename(absPath);
  const name = path.basename(absPath, path.extname(filename));
  return {
    absPath,
    filename,
    name,
  };
}

/**
 * Find the absolute path of a Plasmic component to render
 * - Will default to Home.jsx or Home.tsx first
 * - Otherwise, just pick the first component it sees
 * Pre-condition: expect to find `plasmic.json` in projectDir
 * @param projectDir
 * @returns
 */
async function getPlasmicComponentFile(projectDir: string): Promise<string> {
  // The absolute path to `plasmic.json`
  const plasmicJsonFile = path.join(projectDir, "plasmic.json");
  // The string contents of `plasmic.json`
  const plasmicJsonStr = await fs.readFile(plasmicJsonFile);
  // The JSON contents of `plasmic.json`
  const plasmicJson = JSON.parse(plasmicJsonStr.toString());
  // The directory where Plasmic wrapper components are
  const componentsDir = path.join(projectDir, ensureString(plasmicJson.srcDir));
  // First try to find Home.jsx / Home.tsx
  const homeFilePossibilities = glob.sync(
    path.join(componentsDir, "**", "Home.*")
  );
  if (homeFilePossibilities.length > 0) {
    return homeFilePossibilities[0];
  }
  // Otherwise, just pick the first item we see in `dir`
  const anyFiles = glob.sync(path.join(componentsDir, "*.?sx"));
  // If it's empty, something went wrong!
  return ensure(anyFiles[0]);
}
