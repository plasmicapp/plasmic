import chalk from "chalk";
import cp from "child_process";
import fs from "fs/promises";
import path from "upath";
import util from "util";

export type initArgs = {
  [key: string]: string;
};

const exec = util.promisify(cp.exec);

async function execOrFail(dir: string, command: string, message: string) {
  try {
    await exec(command, {
      cwd: dir,
      env: { ...process.env, PLASMIC_LOADER: "1" },
    });
  } catch (e) {
    console.error(e);
    console.error(chalk.bold(chalk.redBright("Plasmic error:")), message);
    process.exit(1);
  }
}

function objToExecArgs(obj: object) {
  return Object.entries(obj)
    .map(
      ([param, value]) =>
        `--${param}=${Array.isArray(value) ? value.join(",") : value}`
    )
    .join(" ");
}

export async function tryInitializePlasmicDir(
  dir: string,
  plasmicDir: string,
  initArgs: initArgs
) {
  const plasmicExecPath = path.join(dir, "node_modules", ".bin", "plasmic");
  const configPath = path.join(plasmicDir, "plasmic.json");

  try {
    await fs.access(configPath);
    console.log(".plasmic directory detected, skipping init.");
    return;
  } catch {}

  await fs.mkdir(plasmicDir, { recursive: true });

  await execOrFail(
    plasmicDir,
    `${plasmicExecPath} init --yes=true ${objToExecArgs(initArgs)}`,
    "Unable to initialize Plasmic. Please check the above error and try again."
  );
}

export function checkAuth(dir: string, execPath: string) {
  return execOrFail(
    dir,
    `${execPath} auth --check`,
    "Unable to authenticate Plasmic. Please run `plasmic auth` or check your ~/.plasmic.auth file, and try again."
  );
}

export async function readConfig(dir: string) {
  const configPath = path.join(dir, "plasmic.json");
  const configData = await fs.readFile(configPath);
  return JSON.parse(configData.toString());
}

export async function saveConfig(dir: string, config: any) {
  const configPath = path.join(dir, "plasmic.json");
  return fs.writeFile(configPath, JSON.stringify(config, undefined, 2));
}

export async function fixImports(dir: string, plasmicExecPath: string) {
  return execOrFail(
    dir,
    `${plasmicExecPath} fix-imports`,
    `Plasmic was unable to fix the imports for this project. Please delete ${dir} and try again.`
  );
}

/**
 * Convert a page path (like pages/my-page.tsx) into their corresponding path (/my-page).
 */
function getPageUrl(path: string) {
  const [_, url] = path.split(/^pages(.*)\..*$/);
  return url;
}

export function getPagesFromConfig(plasmicDir: string, config: any) {
  const componentData: {
    name: string;
    projectId: string;
    path: string;
    url: string;
  }[] = [];
  for (const project of config.projects) {
    for (const component of project.components) {
      if (component.componentType !== "page") {
        continue;
      }
      componentData.push({
        name: component.name,
        projectId: project.projectId,
        path: path.join(plasmicDir, component.importSpec.modulePath),
        url: getPageUrl(component.importSpec.modulePath),
      });
    }
  }

  return componentData;
}

export async function syncProject(
  dir: string,
  pageDir: string,
  execPath: string,
  projects: string[]
) {
  return execOrFail(
    dir,
    `${execPath} sync --yes --metadata source=loader --projects ${projects.join(
      " "
    )}`,
    "Unable to sync Plasmic project. Please check the above error and try again."
  );
}
