import { banner } from "../lib";
import { spawnOrFail } from "../utils/cmd-utils";
import { installUpgrade } from "../utils/npm-utils";

export async function installCodegenDeps(opts: { projectPath: string }) {
  const { projectPath } = opts;
  return await installUpgrade("@plasmicapp/cli", { workingDir: projectPath });
}

export async function runCodegenSync(opts: {
  projectId: string;
  projectApiToken: string | undefined;
  projectPath: string;
}) {
  const { projectId, projectApiToken, projectPath } = opts;

  banner("SYNCING PLASMIC COMPONENTS");

  const project = projectApiToken
    ? `${projectId}:${projectApiToken}`
    : projectId;

  await spawnOrFail(`npx plasmic sync --yes -p ${project}`, projectPath);
}
