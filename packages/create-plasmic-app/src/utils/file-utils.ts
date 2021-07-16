import { createReadStream, promises as fs, unlinkSync } from "fs";
import glob from "glob";
import L from "lodash";
import * as readline from "readline";
import * as path from "upath";
import { PlatformType, toString } from "../lib";
import { ensure, ensureString } from "./lang-utils";

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

/**
 * create-next-app doesn't create next.config.js,
 * so it's safe to just write the file
 * @param absPath
 * @param projectId
 * @returns
 */
export async function writeDefaultNextjsConfig(
  projectDir: string,
  projectId: string,
  loader: boolean
): Promise<void> {
  const nextjsConfigFile = path.join(projectDir, "next.config.js");

  if (!loader) {
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
    return;
  }

  await fs.writeFile(
    nextjsConfigFile,
    `
const plasmic = require('@plasmicapp/loader/next');
const withPlasmic = plasmic({
  projects: ['${projectId}'] // An array of project ids.
});
module.exports = withPlasmic({
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: true,
  // Your NextJS config.
});
  `
  );
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
 * - [nextjs|gatsby, loader, '/' page exists] - remove index file
 * - [nextjs|gatsby, loader, '/' Page DNE] - replace index file with Welcome page
 * - [nextjs|gatsby, codegen, '/' page exists] - remove Next.js/Gatsby index file, preserve Plasmic index
 * - [nextjs|gatsby, codegen, '/' page DNE] - replace index file with Welcome page
 * - [react, codegen ]  - replace App file with '/', Home, or Welcome page
 * @returns
 */
export async function overwriteIndex(
  projectPath: string,
  platform: string,
  scheme: string
): Promise<void> {
  const isNextjs = platform === "nextjs";
  const isGatsby = platform === "gatsby";
  const isCra = platform === "react";

  const config = await getPlasmicConfig(projectPath, platform, scheme);
  const plasmicFiles = L.map(
    L.flatMap(config.projects, (p) => p.components),
    (c) => c.importSpec.modulePath
  );

  const isTypescript = config?.code?.lang === "ts";
  const pagesDir = ensure(
    isNextjs
      ? path.join(projectPath, "pages/")
      : isGatsby
      ? path.join(projectPath, "src/pages/")
      : isCra
      ? path.join(projectPath, "src/")
      : undefined
  );
  const indexBasename = isCra ? `App` : `index`;
  const extension = isTypescript ? "tsx" : "jsx";
  const indexAbsPath = path.join(pagesDir, `${indexBasename}.${extension}`);

  // Delete existing index files
  // - Skipping any Plasmic-managed files
  // - Note: this only compares basenames, so it may have false positives
  deleteGlob(
    path.join(pagesDir, `${indexBasename}.*`),
    plasmicFiles.map((f) => path.basename(f))
  );

  // Special case: remove all Gatsby components (due to conflicting file names)
  // TODO: find a better way to handle this issue
  if (platform === "gatsby") {
    // Delete the index file
    deleteGlob(path.join(projectPath, "src/@(pages|components)/*.*"), [
      // Files to ignore
      ...plasmicFiles.map((f) => path.basename(f)),
    ]);
    // Create a very basic 404 page - `gatsby build` fails without it.
    // We've deleted the components that the default 404 page depended
    // on, so
    await fs.writeFile(
      path.join(projectPath, "src/pages/404.js"),
      `
const NotFound = () => {
  return "Not Found";
};
export default NotFound;
    `.trim()
    );
  }

  // We're done if we can already render an index page
  if (
    (isNextjs || isGatsby) &&
    plasmicFiles.find((f) => f.includes("/index."))
  ) {
    return;
  }

  const homeFilePossibilities = glob.sync(
    path.join(
      projectPath,
      ensureString(config.srcDir),
      "**",
      "@(index|Home|home).*"
    )
  );
  const content =
    isCra && homeFilePossibilities.length > 0
      ? generateHomePage(homeFilePossibilities[0], indexAbsPath)
      : generateWelcomePage(config, platform);
  await fs.writeFile(indexAbsPath, content);
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
  const contents = `
This is a ${toString(
    platform
  )} project bootstrapped with [\`create-plasmic-app\`](https://www.npmjs.com/package/create-plasmic-app).

## Getting Started

First, run the development server:

\`\`\`bash
${buildCommand}
\`\`\`

Open your browser to see the result.

You can start editing your project in Plasmic Studio. The page auto-updates as you edit the project.

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Slack Community](https://www.plasmic.app/slack)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!
  `.trim();
  await fs.writeFile(readmeFile, contents);
}

/**
 * Generate a file to render the component
 * @param componentAbsPath - absolute path to component to render
 * @param indexAbsPath - absolute path of index file to write
 * @returns
 */
function generateHomePage(
  componentAbsPath: string,
  indexAbsPath: string
): string {
  const componentFilename = path.basename(componentAbsPath);
  const componentName = stripExtension(componentFilename);
  // The relative import path from App.js to the Plasmic component
  const componentRelativePath = path.relative(
    path.dirname(indexAbsPath),
    componentAbsPath
  );
  const appjsContents = `
import ${componentName} from './${stripExtension(componentRelativePath)}';

function App() {
  return (<${componentName} />);
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
function generateWelcomePage(config: any, platform: string): string {
  let hasPages = false;
  let pageComponents: any[];
  let pagesDir: string;
  const linkTag = platform === "nextjs" ? "Link" : "a";
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
        return `<li><${linkTag} style={{ color: "blue" }} href="${relativeLink}">${pc.name} - ${relativeLink}</${linkTag}></li>`;
      })
      .join("\n");
    return `
          <h3>Your pages:</h3>
          <ul>
            ${pageLinks}
          </ul>
    `;
  };

  const content = `
import React from "react";
${hasPages && platform === "nextjs" ? `import Link from "next/link";` : ""}

function PlasmicLogo() {
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M34 26h-2v-1c0-6.627-5.373-12-12-12S8 18.374 8 25v1H6a1 1 0 01-1-1c0-8.284 6.716-15 15-15 8.284 0 15 6.716 15 15a1 1 0 01-1 1z"
        fill="url(#paint0_linear)"
      />
      <path
        d="M27 25a7 7 0 00-14 0v1h2a1 1 0 001-1 4 4 0 018 0 1 1 0 001 1h2v-1z"
        fill="url(#paint1_linear)"
      />
      <path
        d="M30.999 25C30.999 18.925 26.075 14 20 14S9.001 18.926 9.001 25H9v1h3v-1a8 8 0 0116 0v1h3v-1h-.001z"
        fill="url(#paint2_linear)"
      />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1={5}
          y1={26}
          x2={35}
          y2={26}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1877F2" />
          <stop offset={1} stopColor="#04A4F4" />
        </linearGradient>
        <linearGradient
          id="paint1_linear"
          x1={13}
          y1={26}
          x2={27}
          y2={26}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F02849" />
          <stop offset={1} stopColor="#F5533D" />
        </linearGradient>
        <linearGradient
          id="paint2_linear"
          x1={9}
          y1={26}
          x2={31}
          y2={26}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#45BD62" />
          <stop offset={1} stopColor="#2ABBA7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Index() {
  return (
    <div style={{ width: "100%", padding: "100px", alignContent: "center" }}>
      <header>
        <PlasmicLogo />
        <h1 style={{ margin: 0 }}>
          Welcome to Plasmic!
        </h1>
        <h4>
          <a
            style={{ color: "blue" }}
            href="https://www.plasmic.app/learn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn Plasmic
          </a>
        </h4>
        ${hasPages ? getPageSection() : ""}
        <p><i>Note: Remember to remove this file if you introduce a Page component at the &#39;/&#39; path.</i></p>
      </header>
    </div>
  );
}

export default Index;
  `;
  return content;
}

async function getPlasmicConfig(
  projectPath: string,
  platform: string,
  scheme: string
) {
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

export async function wrapAppRoot(
  projectPath: string,
  platform: string,
  scheme: string
): Promise<void> {
  const isLoader = scheme === "loader";
  const importPkg = isLoader ? `@plasmicapp/loader` : "@plasmicapp/react-web";
  if (platform === "nextjs") {
    const appFilePath = path.join(projectPath, "pages", `_app.js`);
    await fs.writeFile(
      appFilePath,
      `
import '../styles/globals.css'
import { PlasmicRootProvider } from "${importPkg}"

function MyApp({ Component, pageProps }) {
  return (
    <PlasmicRootProvider>
      <Component {...pageProps} />
    </PlasmicRootProvider>
  )
}

export default MyApp
    `.trim()
    );
  } else if (platform === "gatsby") {
    const wrapperContent = `
import React from "react";
import { PlasmicRootProvider } from "${importPkg}";

export const wrapRootElement = ({ element }) => {
  return (
    <PlasmicRootProvider>
      {element}
    </PlasmicRootProvider>
  );
}
    `.trim();

    const browserFilePath = path.join(projectPath, "gatsby-browser.js");
    await fs.writeFile(browserFilePath, wrapperContent);

    const ssrFilePath = path.join(projectPath, "gatsby-ssr.js");
    await fs.writeFile(ssrFilePath, wrapperContent);
  }
}
