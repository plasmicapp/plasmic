import cp from "child_process";
import path from "path";
import * as cli from "./cli";
import * as gen from "./gen";

export type PlamicOpts = {
  dir: string;
  pageDir: string;
  projects: string[];
  watch?: boolean;
  initArgs?: cli.initArgs;
};

async function watchForChanges(
  plasmicDir: string,
  pageDir: string,
  cliPath: string
) {
  let oldConfig = await cli.readConfig(plasmicDir);
  const watchCmd = cp.spawn("node", [cliPath, "watch"], {
    cwd: plasmicDir,
  });
  watchCmd.stdout.on("data", async function (data) {
    process.stdout.write(`plasmic: ${data.toString()}`);

    // Once the CLI output this message, we know the components & configs were updated.
    const didUpdate = data.toString().includes("updated to revision");
    if (didUpdate) {
      gen.generateAll({ dir: plasmicDir, pageDir });
      cli.clearStalePages(plasmicDir, pageDir, oldConfig);
      oldConfig = await cli.readConfig(plasmicDir);
    }
  });
}

export async function generateEntrypoint({
  dir,
  pageDir,
  projects,
  watch,
  initArgs = {},
}: PlamicOpts) {
  console.log("Syncing plasmic projects: ", projects);
  const plasmicDir = path.join(dir, ".plasmic");
  const plasmicExecPath = path.join(dir, "node_modules", ".bin", "plasmic");

  await cli.checkAuth(dir, plasmicExecPath);
  await cli.tryInitializePlasmicDir(dir, initArgs);
  await cli.syncProject(plasmicDir, pageDir, plasmicExecPath, projects);
  await gen.generateAll({ dir: plasmicDir, pageDir });

  if (watch) {
    watchForChanges(plasmicDir, pageDir, plasmicExecPath);
  }
}
