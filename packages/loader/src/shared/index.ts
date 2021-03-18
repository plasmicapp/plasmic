import cp from "child_process";
import path from "upath";
import * as cli from "./cli";
import * as gen from "./gen";

export type PlasmicOpts = {
  dir: string;
  plasmicDir: string;
  pageDir: string;
  projects: string[];
  watch?: boolean;
  initArgs?: cli.initArgs;
};

type onRegisterPages = (
  pages: { name: string; projectId: string; path: string; url: string }[],
  config: any
) => void;

async function watchForChanges(
  { dir, plasmicDir, pageDir }: PlasmicOpts,
  onRegisterPages?: onRegisterPages
) {
  const cliPath = path.join(dir, "node_modules", ".bin", "plasmic");
  let currentConfig = await cli.readConfig(plasmicDir);
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
      await gen.generateAll({ dir: plasmicDir, pageDir });
      currentConfig = await cli.readConfig(plasmicDir);
      if (onRegisterPages) {
        onRegisterPages(
          cli.getPagesFromConfig(plasmicDir, currentConfig),
          currentConfig
        );
      }
    }
  });
}

export async function initLoader({
  dir,
  pageDir,
  projects,
  plasmicDir,
  initArgs = {},
}: PlasmicOpts) {
  console.log("Syncing plasmic projects: ", projects);
  const plasmicExecPath = path.join(dir, "node_modules", ".bin", "plasmic");

  await cli.checkAuth(dir, plasmicExecPath);
  await cli.tryInitializePlasmicDir(dir, plasmicDir, initArgs);
  await cli.syncProject(plasmicDir, pageDir, plasmicExecPath, projects);
  await gen.generateAll({ dir: plasmicDir, pageDir });
}

export async function onPostInit(
  opts: PlasmicOpts,
  onRegisterPages?: onRegisterPages
) {
  if (onRegisterPages) {
    const config = await cli.readConfig(opts.plasmicDir);
    onRegisterPages(cli.getPagesFromConfig(opts.plasmicDir, config), config);
  }
  if (opts.watch) {
    watchForChanges(opts, onRegisterPages);
  }
}
