import { ExecaChildProcess } from "execa";
import fs from "fs";
import { copySync } from "fs-extra";
import getPort from "get-port";
import path from "path";
import tmp from "tmp";
import { getEnvVar, PNPM_CACHE_DIR } from "../env";
import { CraEnv, ProjectContext } from "../playwright-tests/setup-utils";
import {
  runCommand,
  uploadProject,
  waitUntilServerDown,
  waitUntilServerUp,
} from "../utils";

export interface CraContext {
  projectId: string;
  projectToken: string;
  tmpdir: string;
  tmpdirCleanup: () => void;
  server: ExecaChildProcess;
  host: string;
}

export async function setupCra(opts: {
  bundleFile: string;
  projectName: string;
  template?: string;
}): Promise<CraContext> {
  const { bundleFile, projectName } = opts;
  const { projectId, projectToken } = await uploadProject(
    bundleFile,
    projectName
  );
  const { name: tmpdir, removeCallback: tmpdirCleanup } = tmp.dirSync({
    unsafeCleanup: true,
  });

  console.log("tmpdir", tmpdir);
  const { server, host } = await setupCraServer(
    { projectId, projectToken },
    { type: "cra", template: opts.template },
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

export async function teardownCra(ctx: CraContext) {
  const { tmpdirCleanup } = ctx;
  await teardownCraServer(ctx);
  tmpdirCleanup();
}

export async function setupCraServer(
  project: ProjectContext,
  env: CraEnv,
  tmpdir: string
) {
  // Limit concurrency to avoid Verdaccio overload. Reducing CI workers is another option.
  const pnpmCiFlags = `--store-dir "${PNPM_CACHE_DIR}" --network-concurrency=8 --fetch-retries=5`;
  const template = env.template ?? "template";
  const templateDir = path.resolve(path.join(__dirname, template));
  copySync(templateDir, tmpdir, { recursive: true });

  const npmRegistry = getEnvVar("NPM_CONFIG_REGISTRY");
  const pnpmOptions = {
    dir: tmpdir,
    env: { PNPM_HOME: PNPM_CACHE_DIR, npm_config_registry: npmRegistry },
  };

  await runCommand(
    `pnpm install --frozen-lockfile ${pnpmCiFlags}`,
    pnpmOptions
  );
  await runCommand(
    `pnpm update @plasmicapp/loader-react --latest ${pnpmCiFlags}`,
    pnpmOptions
  );

  const codegenHost = getEnvVar("WAB_HOST");
  fs.writeFileSync(
    path.join(tmpdir, "src", "config.json"),
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

  const port = await getPort();

  await runCommand(`pnpm run build`, {
    dir: tmpdir,
    env: {
      SKIP_PREFLIGHT_CHECK: "true",
      NODE_OPTIONS: "--openssl-legacy-provider",
    },
  });
  const server = runCommand(`./node_modules/.bin/serve -s build -l ${port}`, {
    dir: tmpdir,
    output: "inherit",
    noExit: true,
  });
  const host = `http://localhost:${port}`;
  console.log(`Starting create-react-app at ${host} (pid ${server.pid})`);
  await waitUntilServerUp(host, { process: server });
  console.log(`Started creact-react-app server at ${host} (pid ${server.pid})`);

  return {
    server,
    host,
  };
}

export async function teardownCraServer(ctx: {
  server: ExecaChildProcess;
  host: string;
}) {
  const { server, host } = ctx;
  console.log(
    `Tearing down create-react-app at ${host} (pid ${server.pid})...`
  );
  server.kill("SIGINT");

  try {
    await waitUntilServerDown(host, { maxTimeout: 60000 });
  } catch {
    throw new Error(`Failed to shut down create-react-app server`);
  }
}
