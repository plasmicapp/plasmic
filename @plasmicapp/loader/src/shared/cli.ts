import cp from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";

export type initArgs = {
  [key: string]: string;
};

const exec = util.promisify(cp.exec);

async function execOrFail(dir: string, command: string, message: string) {
  try {
    await exec(command, {
      cwd: dir,
      stdio: "inherit",
      env: { ...process.env, PLASMIC_LOADER: 1 },
    } as any);
  } catch (e) {
    console.error(e);
    console.error(message);
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

export async function tryInitializePlasmicDir(dir: string, initArgs: initArgs) {
  const plasmicDir = path.join(dir, ".plasmic");
  const plasmicExecPath = path.join(dir, "node_modules", ".bin", "plasmic");
  const configPath = path.join(plasmicDir, "plasmic.json");

  try {
    await fs.access(configPath);
    console.log(".plasmic directory detected, skipping init.");
    return;
  } catch {}

  await fs.mkdir(plasmicDir);

  await execOrFail(
    plasmicDir,
    `${plasmicExecPath} init --yes=true ${objToExecArgs(initArgs)}`,
    "Unable to initialize plasmic. Please check the above error and try again."
  );
}

export function checkAuth(dir: string, execPath: string) {
  return execOrFail(
    dir,
    `${execPath} auth --check`,
    "Unable to authenticate. Please check your auth config and try again."
  );
}

export async function readConfig(dir: string) {
  const configPath = path.join(dir, "plasmic.json");
  const configData = await fs.readFile(configPath);
  return JSON.parse(configData.toString());
}

export async function syncProject(
  dir: string,
  pageDir: string,
  execPath: string,
  projects: string[]
) {
  const oldConfig = await readConfig(dir);
  await execOrFail(
    dir,
    `${execPath} sync --yes --metadata source=loader --projects ${projects.join(
      " "
    )}`,
    "Unable to sync plasmic project. Please check the above error and try again."
  );
  return clearStalePages(dir, pageDir, oldConfig);
}

export async function clearStalePages(
  dir: string,
  pageDir: string,
  oldConfig: any
) {
  const seen: { [key: string]: boolean } = {};
  const stalePaths: string[] = [];
  const newConfig = await readConfig(dir);

  for (const project of newConfig.projects) {
    for (const component of project.components) {
      if (component.componentType !== "page") {
        continue;
      }
      seen[component.id] = true;
    }
  }

  for (const project of oldConfig.projects) {
    for (const component of project.components) {
      if (component.componentType !== "page") {
        continue;
      }
      if (!seen[component.id]) {
        const [_, componentPath] = component.importSpec.modulePath.split(
          /pages/
        );
        stalePaths.push(path.join(pageDir, componentPath));
        stalePaths.push(path.join(dir, "pages", componentPath));
      }
    }
  }
  return Promise.all(stalePaths.map((filePath) => fs.unlink(filePath)));
}
