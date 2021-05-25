import { promises as fs } from "fs";
import path from "upath";
import templates from "../templates";

type ComponentData = {
  name: string;
  projectId: string;
  path: string;
  type: string;
};

type PageData = ComponentData & {
  url: string;
  skeletonPath: string;
  type: "page";
};

type GenOptions = {
  dir: string;
  pageDir: string;
};

type ProviderData = ComponentData & { providerName?: string };

type ConfigData = {
  componentData: Array<ComponentData | PageData>;
  componentDataKeyedByName: Record<string, (ComponentData | PageData)[]>;
  providerData: ProviderData[];
  providersKeyedByName: Record<string, ProviderData[]>;
};

function isPageData(data: ComponentData | PageData): data is PageData {
  return data.type === "page";
}

function stripExtension(filename: string, removeComposedPath = false) {
  const ext = removeComposedPath
    ? filename.substring(filename.indexOf("."))
    : path.extname(filename);
  if (!ext || filename === ext) {
    return filename;
  }
  return filename.substring(0, filename.lastIndexOf(ext));
}

function writeFile(filePath: string, content: string) {
  return fs
    .mkdir(path.dirname(filePath), { recursive: true })
    .then(() => fs.writeFile(filePath, content));
}

export async function getConfigData(opts: GenOptions): Promise<ConfigData> {
  const configPath = path.join(opts.dir, "plasmic.json");
  const configData = await fs.readFile(configPath);
  const config = JSON.parse(configData.toString());

  const componentData: Array<ComponentData | PageData> = [];
  const componentDataKeyedByName: {
    [name: string]: (ComponentData | PageData)[];
  } = {};

  const addToComponentData = (data: ComponentData | PageData) => {
    if (!componentDataKeyedByName[data.name]) {
      componentDataKeyedByName[data.name] = [];
    }
    componentData.push(data);
    componentDataKeyedByName[data.name].push(data);
  };

  for (const project of config.projects) {
    project.components.forEach((component: any) => {
      addToComponentData({
        name: component.name,
        projectId: project.projectId,
        path: path.join(
          opts.dir,
          config.srcDir,
          component.renderModuleFilePath
        ),
        type: component.componentType,
        skeletonPath: path.join(
          opts.dir,
          config.srcDir,
          component.importSpec.modulePath
        ),
        url:
          component.componentType === "page"
            ? getPageUrl(component.importSpec.modulePath)
            : undefined,
      });
    });
    project.icons.forEach((icon: any) =>
      addToComponentData({
        name: icon.name,
        projectId: project.projectId,
        path: path.join(opts.dir, config.srcDir, icon.moduleFilePath),
        type: icon.componentType,
      })
    );
  }

  const providerData: ProviderData[] = [];
  const providersKeyedByName: { [name: string]: ProviderData[] } = {};

  for (const provider of config.globalVariants?.variantGroups || []) {
    const data = {
      name: provider.name,
      projectId: provider.projectId,
      path: path.join(opts.dir, config.srcDir, provider.contextFilePath),
      providerName: provider.name === "Screen" ? "ScreenVariantProvider" : "",
      type: "provider",
    };
    if (!providersKeyedByName[data.name]) {
      providersKeyedByName[data.name] = [];
    }
    providerData.push(data);
    providersKeyedByName[data.name].push(data);
  }

  return {
    componentData,
    componentDataKeyedByName,
    providerData,
    providersKeyedByName,
  };
}

export async function generateAll(opts: GenOptions) {
  const configData = await getConfigData(opts);

  await Promise.all([
    generatePlasmicLoader(configData),
    generatePageComponents(configData),
    generatePlasmicTypes(configData),
  ]);
}

function generatePlasmicTypes(config: ConfigData) {
  const singleComponents = Object.values(config.componentDataKeyedByName)
    .filter((components) => components.length === 1)
    .flat()
    .map((component) => ({
      ...component,
      path: stripExtension(component.path),
    }));
  const components = config.componentData.map((component) => ({
    ...component,
    path: stripExtension(component.path),
  }));
  const providersKeyedByProjectId: Record<string, ProviderData[]> = {};
  config.providerData.forEach((provider) => {
    if (!providersKeyedByProjectId[provider.projectId]) {
      providersKeyedByProjectId[provider.projectId] = [];
    }
    providersKeyedByProjectId[provider.projectId].push(provider);
  });

  const providersWithProjects = Object.entries(providersKeyedByProjectId).map(
    ([projectId, providers]) => ({
      projectId,
      providers: providers.map((provider) => ({
        ...provider,
        path: stripExtension(provider.path),
      })),
    })
  );

  const singleProviders = Object.values(config.providersKeyedByName)
    .filter((providers) => providers.length === 1)
    .flat()
    .map((provider) => ({
      ...provider,
      path: stripExtension(provider.path),
    }));
  
  return writeFile(
    path.join(__dirname, "../", "loaderTypes.d.ts"),
    templates.LoaderTypes({
      singleComponents,
      components,
      providersWithProjects,
      singleProviders,
    })
  );
}

async function generatePageComponents(config: ConfigData) {
  // TODO: doing it sequentially because we may have the same page in multiple
  // projects. This results in writing to the same file, which may creates wrong file content.
  // This way, the last page will be synced.
  for (const data of config.componentData.filter(isPageData)) {
    await writeFile(
      data.skeletonPath,
      templates.PlasmicPage({
        name: data.name,
        projectId: data.projectId,
      })
    );
  }
}

function getPageUrl(path: string) {
  // Convert a page path (like pages/my-page.tsx or ../pages/index.jsx) into their
  // corresponding path (/my-page).
  let [_, url] = path.split(/pages(.*)\..*$/);

  // Remove the ending "/index" path, which is required for file routing but not for URLs.
  // Examples:
  // /index -> /
  // /index/index -> /index

  if (url.endsWith("index")) {
    url = url.slice(0, -6);
  }
  return url === "" ? "/" : url;
}

function generatePlasmicLoader(config: ConfigData) {
  const entrypointPath = path.join(__dirname, "../", "PlasmicLoader.jsx");

  return writeFile(
    entrypointPath,
    templates.PlasmicLoader({
      componentData: config.componentData,
      pagesByUrl: config.componentData.filter(isPageData),
      componentsWithOneProject: Object.values(config.componentDataKeyedByName)
        .filter((components) => components.length === 1)
        .flat(),
      componentMap: Object.entries(config.componentDataKeyedByName).map(
        ([name, projects]) => ({ name, projects })
      ),
      providerData: config.providerData,
      providersWithOneProject: Object.values(config.providersKeyedByName)
        .filter((providers) => providers.length === 1)
        .flat(),
      providerMap: Object.entries(config.providersKeyedByName).map(
        ([name, projects]) => ({ name, projects })
      ),
    })
  );
}
