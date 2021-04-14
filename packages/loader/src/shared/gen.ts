import fs from "fs/promises";
import path from "upath";
import templates from "../templates";
import * as logger from "./logger";

type ComponentData = {
  name: string;
  projectId: string;
  path: string;
};

type GenOptions = {
  dir: string;
  pageDir: string;
};

type ProviderData = ComponentData & { providerName?: string };

function writeFile(filePath: string, content: string) {
  return fs
    .mkdir(path.dirname(filePath), { recursive: true })
    .then(() => fs.writeFile(filePath, content));
}

export async function generateAll(opts: GenOptions) {
  const configPath = path.join(opts.dir, "plasmic.json");
  const configData = await fs.readFile(configPath);
  const config = JSON.parse(configData.toString());

  await Promise.all([
    generatePlasmicLoader(opts.dir, config),
    generatePageComponents(opts.pageDir, config),
  ]);
}

async function generatePageComponents(dir: string, config: any) {
  const componentData: ComponentData[] = [];
  for (const project of config.projects) {
    for (const component of project.components) {
      if (component.componentType !== "page") {
        continue;
      }
      const [_, componentPath] = component.importSpec.modulePath.split(/pages/);
      componentData.push({
        name: component.name,
        projectId: project.projectId,
        path: path.join(dir, componentPath),
      });
    }
  }

  await Promise.all(
    componentData.map((data) =>
      writeFile(
        data.path,
        templates.PlasmicPage({
          name: data.name,
          projectId: data.projectId,
        })
      )
    )
  );
}

function generatePlasmicLoader(dir: string, config: any) {
  const entrypointPath = path.join(__dirname, "../", "PlasmicLoader.jsx");
  const componentData: ComponentData[] = [];
  const componentDataKeyedByName: { [name: string]: ComponentData[] } = {};

  const addToComponentData = (data: ComponentData) => {
    if (!componentDataKeyedByName[data.name]) {
      componentDataKeyedByName[data.name] = [];
    }
    componentData.push(data);
    componentDataKeyedByName[data.name].push(data);
  };

  for (const project of config.projects) {
    project.components.forEach((component: any) =>
      addToComponentData({
        name: component.name,
        projectId: project.projectId,
        path: path.join(dir, config.srcDir, component.renderModuleFilePath),
      })
    );
    project.icons.forEach((icon: any) =>
      addToComponentData({
        name: icon.name,
        projectId: project.projectId,
        path: path.join(dir, config.srcDir, icon.moduleFilePath),
      })
    );
  }

  const providerData: ProviderData[] = [];
  const providersKeyedByName: { [name: string]: ProviderData[] } = {};

  for (const provider of config.globalVariants?.variantGroups || []) {
    const data = {
      name: provider.name,
      projectId: provider.projectId,
      path: path.join(dir, config.srcDir, provider.contextFilePath),
      providerName: provider.name === "Screen" ? "ScreenVariantProvider" : "",
    };
    if (!providersKeyedByName[data.name]) {
      providersKeyedByName[data.name] = [];
    }
    providerData.push(data);
    providersKeyedByName[data.name].push(data);
  }

  return writeFile(
    entrypointPath,
    templates.PlasmicLoader({
      componentData,
      componentsWithOneProject: Object.values(componentDataKeyedByName)
        .filter((components) => components.length === 1)
        .flat(),
      componentMap: Object.entries(
        componentDataKeyedByName
      ).map(([name, projects]) => ({ name, projects })),
      providerData,
      providersWithOneProject: Object.values(providersKeyedByName)
        .filter((providers) => providers.length === 1)
        .flat(),
      providerMap: Object.entries(
        providersKeyedByName
      ).map(([name, projects]) => ({ name, projects })),
    })
  );
}

type Pages = {
  name: string;
  projectId: string;
  path: string;
  url: string;
};

let didWarnConflictingRoot = false;
let didWarnConflictingCatchAll = false;

export async function generateNextPages(
  pages: Pages[],
  dir: string,
  config: any
) {
  const extension = config.code.lang === "js" ? ".js" : ".tsx";
  const indexFilename = "index" + extension;
  const catchAllFileName = "[...plasmicLoaderPage]" + extension;
  const topLevelPages = await fs.readdir(dir);

  const plasmicRootPage = pages.find((page) => page.url === "/");
  const existingRootPage = topLevelPages.find((page) =>
    page.match(/^index\.(js|jsx|ts|tsx)$/)
  );

  let conflictingRoot =
    plasmicRootPage &&
    existingRootPage &&
    !(await isPlasmicManagedFile(path.join(dir, existingRootPage)));
  const conflictingCatchAll = topLevelPages.find(
    (page) => page.startsWith("[") && page !== catchAllFileName
  );

  if (conflictingRoot && !didWarnConflictingRoot) {
    logger.warn(
      `Top-level ${existingRootPage} detected.\nPlasmic uses a catch-all file to register Plasmic pages. Because of this conflict, Plasmic wont register this page.`
    );
    didWarnConflictingRoot = true;
  }

  if (conflictingCatchAll && !didWarnConflictingCatchAll) {
    logger.warn(
      `Top-level ${conflictingCatchAll} detected.\nPlasmic uses a catch-all file to register Plasmic pages. Because of this conflict, Plasmic pages will be ignored.`
    );
    didWarnConflictingCatchAll = true;
  }

  if (!conflictingRoot && plasmicRootPage) {
    await fs.writeFile(
      path.join(dir, indexFilename),
      templates.PlasmicPage({
        name: plasmicRootPage.name,
        projectId: plasmicRootPage.projectId,
      })
    );
  }

  if (!conflictingCatchAll) {
    const pagesToWrite: Pages[] = [];
    for (const page of pages) {
      if (page.url === "/") continue;
      try {
        const possiblePath =
          path.join(dir, ...page.url.substring(1).split("/")) + extension;
        await fs.access(possiblePath);
        continue;
      } catch {
        pagesToWrite.push(page);
      }
    }

    await fs.writeFile(
      path.join(dir, catchAllFileName),
      templates.NextPage({
        pages: pagesToWrite.map((page) => ({
          ...page,
          url: page.url.substring(1),
          urlpaths: page.url.substring(1).split("/"),
        })),
      })
    );
  }
}

export async function isPlasmicManagedFile(path: string) {
  const content = await fs.readFile(path);
  return content
    .toString()
    .startsWith("/** This file is auto-generated by Plasmic");
}
