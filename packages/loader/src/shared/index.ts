import cp from "child_process";
import path from "path";
import * as cli from "./cli";
import * as gen from "./gen";

export type PlasmicOpts = {
  dir: string;
  plasmicDir: string;
  pageDir: string;
  projects: string[];
  watch?: boolean;
  initArgs?: cli.initArgs;
  ignorePages?: string[];
};

async function watchForChanges(
  plasmicDir: string,
  pageDir: string,
  cliPath: string
) {
  let oldConfig = await cli.readConfig(plasmicDir);
  const watchCmd = cp.spawn(
    "node",
    [cliPath, "watch", "--yes", "--metadata", "source=loader"],
    {
      cwd: plasmicDir,
      env: { ...process.env, PLASMIC_LOADER: "1" },
      stdio: "pipe",
    }
  );
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
  plasmicDir,
  ignorePages,
  initArgs = {},
}: PlasmicOpts) {
  console.log("Syncing plasmic projects: ", projects);
  const plasmicExecPath = path.join(dir, "node_modules", ".bin", "plasmic");

  await cli.checkAuth(dir, plasmicExecPath);
  await cli.tryInitializePlasmicDir(dir, plasmicDir, initArgs);
  await cli.syncProject(plasmicDir, pageDir, plasmicExecPath, projects);
  await gen.generateAll({ dir: plasmicDir, pageDir, ignorePages });

  if (watch) {
    watchForChanges(plasmicDir, pageDir, plasmicExecPath);
  }
}
