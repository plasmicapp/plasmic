import { ExecaChildProcess } from "execa";
import fs from "fs";
import { copySync } from "fs-extra";
import getPort from "get-port";
import path from "path";
import tmp from "tmp";
import { getEnvVar } from "../env";
import { GatsbyEnv, ProjectContext } from "../playwright-tests/setup-utils";
import {
  runCommand,
  uploadProject,
  waitUntilServerDown,
  waitUntilServerUp,
} from "../utils";

export interface GatsbyContext {
  projectId: string;
  projectToken: string;
  tmpdir: string;
  tmpdirCleanup: () => void;
  server: ExecaChildProcess;
  host: string;
}

export async function setupGatsby(opts: {
  bundleFile: string;
  projectName: string;
  template?: string;
}): Promise<GatsbyContext> {
  const { bundleFile, projectName } = opts;
  const { projectId, projectToken } = await uploadProject(
    bundleFile,
    projectName
  );
  const { name: tmpdir, removeCallback: tmpdirCleanup } = tmp.dirSync({
    unsafeCleanup: true,
    prefix: `plasmic-gatsby-${process.pid}-${
      process.env.TEST_WORKER_INDEX || 0
    }-${Date.now()}-`,
  });

  console.log("tmpdir", tmpdir);

  const { server, host } = await setupGatsbyServer(
    { projectId, projectToken },
    {
      type: "gatsby",
      template: opts.template,
    },
    tmpdir
  );

  return {
    projectId,
    projectToken,
    tmpdir,
    tmpdirCleanup,
    server,
    host,
  };
}

export async function teardownGatsby(ctx: GatsbyContext | undefined) {
  if (!ctx) {
    return;
  }

  const { tmpdirCleanup } = ctx;
  await teardownGatsbyServer(ctx);
  tmpdirCleanup();
}

export async function teardownGatsbyServer(ctx: {
  server: ExecaChildProcess;
  host: string;
}) {
  const { server, host } = ctx;
  console.log(`Tearing down gatsby at ${host} (pid ${server.pid})...`);
  server.kill("SIGINT");

  try {
    await waitUntilServerDown(host, { maxTimeout: 60000 });
  } catch {
    throw new Error(`Failed to shut down gatsby server`);
  }
}

export async function setupGatsbyServer(
  project: ProjectContext,
  env: GatsbyEnv,
  tmpdir: string
) {
  const template = env.template ?? "template";
  const templateDir = path.resolve(path.join(__dirname, template));
  copySync(templateDir, tmpdir, { recursive: true });

  const npmRegistry = getEnvVar("NPM_CONFIG_REGISTRY");
  // Gatsby needs it's own separate cache for some reason, otherwise `pnpm install` fails in CI
  // TODO -- figure out why Gatsby is special and remove this.
  const cacheDir = path.join(tmpdir, ".pnpm-cache");
  const pnpmOptions = {
    dir: tmpdir,
    env: { PNPM_HOME: cacheDir, npm_config_registry: npmRegistry },
  };

  await runCommand(
    `pnpm install --frozen-lockfile --store-dir "${cacheDir}"`,
    pnpmOptions
  );
  await runCommand(
    `pnpm update @plasmicapp/loader-gatsby --latest --store-dir "${cacheDir}"`,
    pnpmOptions
  );

  const codegenHost = getEnvVar("WAB_HOST");
  fs.writeFileSync(
    path.join(tmpdir, "config.json"),
    JSON.stringify({
      projects: [
        {
          id: project.projectId,
          token: project.projectToken,
        },
      ],
      host: codegenHost,
    })
  );

  await runCommand(`pnpm run build`, { dir: tmpdir });

  const port = await getPort();
  const server = runCommand(`./node_modules/.bin/gatsby serve --port ${port}`, {
    dir: tmpdir,
    output: "inherit",
    noExit: true,
  });
  const host = `http://localhost:${port}`;
  console.log(`Starting gatsby at ${host} (pid ${server.pid})`);
  await waitUntilServerUp(host, { process: server });
  console.log(`Started gatsby server at ${host} (pid ${server.pid})`);

  return {
    server,
    host,
  };
}
