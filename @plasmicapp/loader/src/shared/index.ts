import cp from "child_process";
import dot from "dot";
import fs from "fs";
import path from "path";

dot.templateSettings.strip = false;

function execOrFail(dir: string, command: string, message: string) {
  try {
    cp.execSync(command, { cwd: dir, stdio: "inherit" });
  } catch (e) {
    console.error(e);
    console.error(message);
    process.exit(1);
  }
}

function convertToUrlPath(filepath: string) {
  return filepath.replace(/\\/g, "/");
}

function tryInitializePlasmicDir(dir: string) {
  const plasmicDir = path.join(dir, ".plasmic");
  const plasmicExecPath = path.join(dir, "node_modules", ".bin", "plasmic");
  const configPath = path.join(plasmicDir, "plasmic.json");
  if (fs.existsSync(configPath)) {
    console.log(".plasmic directory detected, skipping init.");
    return;
  }

  fs.mkdirSync(plasmicDir);

  execOrFail(
    plasmicDir,
    `${plasmicExecPath} init --yes`,
    "Unable to initialize plasmic. Please check the above error and try again."
  );
}

type ComponentData = {
  name: string;
  projectId: string;
  path: string;
};

type ProviderData = ComponentData & { providerName?: string };

function generatePlasmicLoader(dir: string) {
  const configPath = path.join(dir, "plasmic.json");
  const entrypointPath = path.join(__dirname, "../", "PlasmicLoader.jsx");
  const templatePath = path.join(__dirname, "../", "templates");

  const templates = (dot as any).process({ path: templatePath });
  const configData = fs.readFileSync(configPath);
  const config = JSON.parse(configData.toString());

  const componentData: ComponentData[] = [];
  const componentDataKeyedByName: { [name: string]: ComponentData[] } = {};

  for (const project of config.projects) {
    for (const component of project.components) {
      const data = {
        name: component.name,
        projectId: project.projectId,
        path: convertToUrlPath(
          path.join(dir, config.srcDir, component.renderModuleFilePath)
        ),
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
      path: convertToUrlPath(
        path.join(dir, config.srcDir, provider.contextFilePath)
      ),
      providerName: provider.name === "Screen" ? "ScreenVariantProvider" : "",
    };
    if (!providersKeyedByName[data.name]) {
      providersKeyedByName[data.name] = [];
    }
    providerData.push(data);
    providersKeyedByName[data.name].push(data);
  }

  fs.writeFileSync(
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

export type PlamicOpts = {
  dir: string;
  projects: string[];
  watch?: boolean;
};

export function generateEntrypoint({ dir, projects, watch }: PlamicOpts) {
  console.log("Syncing plasmic projects: ", projects);
  const plasmicDir = path.join(dir, ".plasmic");
  const plasmicExecPath = path.join(dir, "node_modules", ".bin", "plasmic");

  execOrFail(
    dir,
    `${plasmicExecPath} auth --check`,
    "Unable to authenticate. Please check your auth config and try again."
  );

  tryInitializePlasmicDir(dir);

  execOrFail(
    plasmicDir,
    `${plasmicExecPath} sync --yes  --projects ${projects.join(" ")}`,
    "Unable to sync plasmic project. Please check the above error and try again."
  );

  generatePlasmicLoader(plasmicDir);

  if (watch) {
    const watchCmd = cp.spawn("node", [plasmicExecPath, "watch"], {
      cwd: plasmicDir,
    });
    watchCmd.stdout.on("data", function (data) {
      process.stdout.write(`plasmic: ${data.toString()}`);

      // Once the CLI output this message, we know the components & configs were updated.
      const didUpdate = data.toString().includes("updated to revision");
      if (didUpdate) {
        generatePlasmicLoader(plasmicDir);
      }
    });
  }
}
