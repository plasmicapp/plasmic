import { ExecaChildProcess } from "execa";
import fs from "fs";
import { copySync } from "fs-extra";
import getPort from "get-port";
import path from "path";
import tmp from "tmp";
import { getEnvVar } from "../env";
import { NextJsEnv, ProjectContext } from "../playwright-tests/setup-utils";
import {
  runCommand,
  uploadProject,
  waitUntilServerDown,
  waitUntilServerUp,
} from "../utils";

export interface NextJsContext {
  projectId: string;
  projectToken: string;
  tmpdir: string;
  tmpdirCleanup: () => void;
  server: ExecaChildProcess;
  host: string;
}

export async function prepareTemplate(opts: {
  templateDir: string;
  tmpdir: string;
  removeComponentsPage?: boolean;
  npmRegistry: string;
  codegenHost: string;
  nextVersion: string;
  loaderVersion: string;
  projectId: string;
  projectToken: string;
  authRedirectUri?: string;
}) {
  const {
    templateDir,
    tmpdir,
    removeComponentsPage,
    npmRegistry,
    codegenHost,
    nextVersion,
    loaderVersion,
    projectId,
    projectToken,
    authRedirectUri,
  } = opts;

  copySync(templateDir, tmpdir, { recursive: true });

  if (removeComponentsPage) {
    fs.unlinkSync(path.join(tmpdir, "pages/components.tsx"));
  }

  await runCommand(`npm install  --registry ${npmRegistry}`, {
    dir: tmpdir,
  });

  // Remove and install the designated next version
  await runCommand(`npm uninstall next`, { dir: tmpdir });
  await runCommand(`npm install  next@${nextVersion}`, {
    dir: tmpdir,
  });

  // Remove and install the designated @plasmicapp/loader-nextjs version
  await runCommand(`npm uninstall @plasmicapp/loader-nextjs`, {
    dir: tmpdir,
  });
  await runCommand(
    `npm install  --registry ${
      loaderVersion !== "latest" ? "https://registry.npmjs.org" : npmRegistry
    } @plasmicapp/loader-nextjs@${loaderVersion}`,
    { dir: tmpdir }
  );

  fs.writeFileSync(
    path.join(tmpdir, "config.json"),
    JSON.stringify({
      projects: [
        {
          id: projectId,
          token: projectToken,
        },
      ],
      host: codegenHost,
    })
  );

  const catchAllPath = path.join(tmpdir, "pages", "[[...catchall]].tsx");
  const catchAllContent = fs.readFileSync(catchAllPath);
  let adjustedCatchAllContent = catchAllContent
    .toString()
    .replace("undefined; // __DATA_HOST__", `"${codegenHost}";`);

  if (authRedirectUri) {
    adjustedCatchAllContent = adjustedCatchAllContent.replace(
      "undefined; // __AUTH_REDIRECT_URI__",
      `"${authRedirectUri}/";`
    );
  }

  fs.writeFileSync(catchAllPath, adjustedCatchAllContent);
}

export async function setupNextJs(opts: {
  bundleFile: string;
  projectName: string;
  npmRegistry: string;
  codegenHost: string;
  removeComponentsPage?: boolean;
  template?: string;
  bundleTransformation?: (value: string) => string;
  loaderVersion?: string;
  nextVersion?: string;
  dataSourceReplacement?: {
    type: string;
  };
}): Promise<NextJsContext> {
  const {
    bundleFile,
    projectName,
    npmRegistry,
    codegenHost,
    removeComponentsPage,
    bundleTransformation,
    loaderVersion = "latest",
    // TODO: Only works with 12 sine we're running with node 14 for now...
    nextVersion = "^12",
    dataSourceReplacement,
  } = opts;
  const { projectId, projectToken } = await uploadProject(
    bundleFile,
    projectName,
    { bundleTransformation, dataSourceReplacement }
  );
  const { name: tmpdir, removeCallback: tmpdirCleanup } = tmp.dirSync({
    unsafeCleanup: true,
  });

  console.log("tmpdir", tmpdir);

  const { server, host } = await setupNextjsServer(
    { projectId, projectToken },
    {
      type: "nextjs",
      loaderVersion,
      nextVersion,
      removeComponentsPage,
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

export async function teardownNextJs(ctx: NextJsContext) {
  const { tmpdirCleanup } = ctx;

  await teardownNextJsServer(ctx);
  tmpdirCleanup();
}

export async function teardownNextJsServer(ctx: {
  server: ExecaChildProcess;
  host: string;
}) {
  const { server, host } = ctx;
  console.log(`Tearing down nextjs at ${host} (pid ${server.pid})...`);
  server.kill("SIGINT");

  try {
    await waitUntilServerDown(host, { maxTimeout: 60000 });
  } catch {
    throw new Error(`Failed to shut down nextjs server`);
  }
}

export async function setupNextjsServer(
  project: ProjectContext,
  env: NextJsEnv,
  dir: string
) {
  const template = env.template ?? "template";
  const templateDir = path.resolve(path.join(__dirname, template));

  await prepareTemplate({
    templateDir,
    tmpdir: dir,
    removeComponentsPage: env.removeComponentsPage,
    npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
    codegenHost: getEnvVar("WAB_HOST"),
    nextVersion: env.nextVersion,
    loaderVersion: env.loaderVersion,
    projectId: project.projectId,
    projectToken: project.projectToken,
  });

  await runCommand(`npm run build`, { dir });

  const port = await getPort();
  const nextServer = runCommand(
    `./node_modules/.bin/next start --port ${port}`,
    { dir, output: "inherit", noExit: true }
  );
  const host = `http://localhost:${port}`;
  await waitUntilServerUp(host, { process: nextServer });
  console.log(`Started nextjs server at ${host} (pid ${nextServer.pid})`);

  return {
    server: nextServer,
    host,
  };
}
