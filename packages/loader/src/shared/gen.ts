import dot from "dot";
import fs from "fs/promises";
import path from "path";

dot.templateSettings.strip = false;

type ComponentData = {
  name: string;
  projectId: string;
  path: string;
};

type GenOptions = {
  dir: string;
  pageDir: string;
  ignorePages?: string[];
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

  const templatePath = path.join(__dirname, "../", "templates");
  const templates = (dot as any).process({ path: templatePath });

  await Promise.all([
    generatePlasmicLoader(opts.dir, config, templates),
    opts.ignorePages
      ? Promise.resolve()
      : generatePageComponents(opts.pageDir, config, templates),
  ]);
}

async function generatePageComponents(
  dir: string,
  config: any,
  templates: any
) {
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

function generatePlasmicLoader(dir: string, config: any, templates: any) {
  const entrypointPath = path.join(__dirname, "../", "PlasmicLoader.jsx");
  const componentData: ComponentData[] = [];
  const componentDataKeyedByName: { [name: string]: ComponentData[] } = {};

  for (const project of config.projects) {
    for (const component of project.components) {
      const data = {
        name: component.name,
        projectId: project.projectId,
        path: path.join(dir, config.srcDir, component.renderModuleFilePath),
      };
      if (!componentDataKeyedByName[data.name]) {
        componentDataKeyedByName[data.name] = [];
      }
      componentData.push(data);
      componentDataKeyedByName[data.name].push(data);
    }
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
