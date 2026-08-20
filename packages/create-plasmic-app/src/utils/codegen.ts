import { promises as fs } from "fs";
import path from "path";
import { banner } from "../lib";
import { spawnOrFail } from "../utils/cmd-utils";
import { installUpgrade, packageManagerExec } from "../utils/npm-utils";
import { PackageManagerType } from "../utils/types";

export async function installCodegenDeps(opts: {
  projectPath: string;
  packageManager: PackageManagerType;
}) {
  const { projectPath, packageManager } = opts;
  // Generated pages import @plasmicapp/host directly
  return await installUpgrade("@plasmicapp/cli @plasmicapp/host", {
    workingDir: projectPath,
    packageManager,
  });
}

export async function runCodegenSync(opts: {
  projectId: string;
  projectApiToken: string | undefined;
  projectPath: string;
  packageManager: PackageManagerType;
}) {
  const { projectId, projectApiToken, projectPath, packageManager } = opts;

  banner("SYNCING PLASMIC COMPONENTS");

  const project = projectApiToken
    ? `${projectId}:${projectApiToken}`
    : projectId;

  await spawnOrFail(
    `${packageManagerExec(packageManager)} plasmic sync --yes -p ${project}`,
    projectPath
  );

  // Pin the package manager, so syncs don't have to guess from lockfiles
  const configPath = path.join(projectPath, "plasmic.json");
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  await fs.writeFile(
    configPath,
    JSON.stringify({ ...config, packageManager }, undefined, 2) + "\n"
  );
}
