import cp from "child_process";
import path from "upath";
import * as cli from "./cli";
import * as gen from "./gen";
import * as substitutions from "./substitutions";

export type PlasmicOpts = {
  dir: string;
  plasmicDir: string;
  pageDir: string;
  projects: string[];
  watch?: boolean;
  initArgs?: cli.initArgs;
  substitutions?: substitutions.Substitutions;
};

type onRegisterPages = (
  pages: { name: string; projectId: string; path: string; url: string }[],
  config: any
) => void;

async function watchForChanges(
  { dir, plasmicDir, pageDir }: PlasmicOpts,
  onRegisterPages?: onRegisterPages
) {
  const cliPath = path.join(plasmicDir, "node_modules", ".bin", "plasmic");
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

export async function initLoader(opts: PlasmicOpts) {
  const { dir, pageDir, projects, plasmicDir, initArgs = {} } = opts;
  console.log("Checking that your loader version is up to date.");
  await cli.ensureRequiredLoaderVersion();
  console.log("Syncing plasmic projects: ", projects);
  const plasmicExecPath = path.join(plasmicDir, "node_modules", ".bin", "plasmic");

  await cli.tryInitializePlasmicDir(dir, plasmicDir, initArgs);
  await cli.checkAuth(dir, plasmicExecPath);
  await cli.syncProject(plasmicDir, pageDir, plasmicExecPath, projects);

  if (opts.substitutions) {
    console.log("Registering substitutions...");
    const config = await cli.readConfig(plasmicDir);
    substitutions.registerSubstitutions(plasmicDir, config, opts.substitutions);
    await cli.saveConfig(plasmicDir, config);
    await cli.fixImports(plasmicDir, plasmicExecPath);
  }

  console.log("Generating loader...");

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
