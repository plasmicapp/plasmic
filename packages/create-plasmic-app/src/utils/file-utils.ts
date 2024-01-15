import type { PlasmicConfig } from "@plasmicapp/cli/dist/utils/config-utils";
import { existsSync, promises as fs, unlinkSync } from "fs";
import glob from "glob";
import L from "lodash";
import * as path from "upath";
import { README } from "../templates/readme";
import { WELCOME_PAGE } from "../templates/welcomePage";
import { JsOrTs, PlatformType } from "../utils/types";
import { ensure } from "./lang-utils";
import { installUpgrade } from "./npm-utils";

/**
 * Runs the search pattern through `glob` and deletes all resulting files
 * @param searchPattern - glob search query
 * @param skipPatterns - array of fragments. Skip any file contains any of the fragments
 */
export function deleteGlob(
  searchPattern: string,
  skipPatterns?: string[]
): void {
  const filesToDelete = glob
    .sync(searchPattern)
    .filter(
      (file) =>
        !skipPatterns || !skipPatterns.find((pattern) => file.includes(pattern))
    );
  filesToDelete.forEach((f: string) => unlinkSync(f));
}

export function stripExtension(
  filename: string,
  removeComposedPath = false
): string {
  const ext = removeComposedPath
    ? filename.substring(filename.indexOf("."))
    : path.extname(filename);
  if (!ext || filename === ext) {
    return filename;
  }
  return filename.substring(0, filename.lastIndexOf(ext));
}

export async function writePlasmicLoaderJson(
  projectDir: string,
  projectId: string,
  projectApiToken: string
): Promise<void> {
  const plasmicLoaderJson = path.join(projectDir, "plasmic-loader.json");
  const content = {
    projects: [
      {
        projectId,
        projectApiToken,
      },
    ],
  };
  await fs.writeFile(plasmicLoaderJson, JSON.stringify(content));
}

/**
 * Overwrite the README file
 * @param projectPath
 * @param platform
 * @param buildCommand
 */
export async function overwriteReadme(
  projectPath: string,
  platform: PlatformType,
  buildCommand: string
): Promise<void> {
  const readmeFile = path.join(projectPath, "README.md");
  const contents = README(platform, buildCommand);
  await fs.writeFile(readmeFile, contents);
}

/**
 * Generate a file to render the component
 * @param componentAbsPath - absolute path to component to render
 * @param indexAbsPath - absolute path of index file to write
 * @returns
 */
export function generateHomePage(
  componentAbsPath: string,
  indexAbsPath: string,
  globalContextsAbsPath?: string
): string {
  const componentFilename = path.basename(componentAbsPath);
  const componentName = stripExtension(componentFilename);
  // The relative import path from App.js to the Plasmic component
  const componentRelativePath = path.relative(
    path.dirname(indexAbsPath),
    componentAbsPath
  );
  const globalContextsImport = globalContextsAbsPath
    ? `import GlobalContextsProvider from './${stripExtension(
        path.relative(path.dirname(indexAbsPath), globalContextsAbsPath)
      )}'`
    : ``;
  const maybeWrapInGlobalContexts = (content: string) => {
    return globalContextsAbsPath
      ? `<GlobalContextsProvider>${content}</GlobalContextsProvider>`
      : content;
  };

  const appjsContents = `
import ${componentName} from './${stripExtension(componentRelativePath)}';
${globalContextsImport}

function App() {
  return (${maybeWrapInGlobalContexts(`<${componentName} />`)});
}

export default App;
  `;
  return appjsContents;
}

/**
 * Generate a Welcome page based on a PlasmicConfig
 * @param config - PlasmicConfig
 * @param noPages - don't render links to pages
 * @returns
 */
export function generateWelcomePage(config: any, platform: string): string {
  let hasPages = false;
  let pageComponents: any[];
  let pagesDir: string;
  if (platform !== "react" && config && L.isArray(config.projects)) {
    pageComponents = L.flatMap(config.projects, (p) => p.components).filter(
      (c) => c.componentType === "page"
    );
    pagesDir = config?.nextjsConfig?.pagesDir ?? config?.gatsbyConfig?.pagesDir;
    if (pageComponents.length > 0 && pagesDir) {
      hasPages = true;
    }
  }
  const getPageSection = () => {
    const pageLinks = pageComponents
      .map((pc) => {
        // Get the relative path on the filesystem
        const relativePath = path.relative(pagesDir, pc.importSpec.modulePath);
        // Format as an absolute path without the extension name
        const relativeLink = "/" + stripExtension(relativePath);
        if (platform === "nextjs") {
          return `<li><Link href="${relativeLink}">${pc.name} - ${relativeLink}</Link></li>`;
        } else {
          return `<li><a style={{ color: "blue" }} href="${relativeLink}">${pc.name} - ${relativeLink}</a></li>`;
        }
      })
      .join("\n");
    return `
          <h3>Your pages:</h3>
          <ul>
            ${pageLinks}
          </ul>
    `;
  };

  const content = WELCOME_PAGE(
    hasPages,
    platform,
    hasPages ? getPageSection() : ""
  );
  return content;
}

export async function getPlasmicConfig(
  projectPath: string,
  platform: PlatformType,
  scheme: string
): Promise<PlasmicConfig> {
  const isNextjs = platform === "nextjs";
  const isGatsby = platform === "gatsby";
  const isLoader = scheme === "loader";
  const isCodegen = scheme === "codegen";
  const configPath = ensure(
    isCodegen
      ? "plasmic.json"
      : isNextjs && isLoader
      ? ".plasmic/plasmic.json"
      : isGatsby && isLoader
      ? ".cache/.plasmic/plasmic.json"
      : undefined
  );
  const configStr = await fs.readFile(path.join(projectPath, configPath));
  return JSON.parse(configStr.toString());
}

// Create tsconfig.json if it doesn't exist
// this will force Plasmic to recognize Typescript
export async function ensureTsconfig(projectPath: string): Promise<void> {
  const tsconfigPath = path.join(projectPath, "tsconfig.json");
  if (!existsSync(tsconfigPath)) {
    await fs.writeFile(tsconfigPath, "");
    const installTsResult = await installUpgrade("typescript @types/react", {
      workingDir: projectPath,
    });
    if (!installTsResult) {
      throw new Error("Failed to install Typescript");
    }
  }
}

export function ifTs(ts: JsOrTs, str: string) {
  return ts === "ts" ? str : "";
}
