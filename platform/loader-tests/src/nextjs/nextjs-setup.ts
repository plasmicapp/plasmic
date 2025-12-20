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
    nextVersion,
    loaderVersion,
    projectId,
    projectToken,
    authRedirectUri,
  } = opts;

  const npmRegistry = getEnvVar("NPM_CONFIG_REGISTRY");
  const codegenHost = getEnvVar("WAB_HOST");
  const npmCache =
    getEnvVar("NPM_CONFIG_CACHE") || path.join(tmpdir, ".npm-cache");
  const npmTmp = path.join(tmpdir, ".npm-tmp");

  copySync(templateDir, tmpdir, { recursive: true });

  if (removeComponentsPage) {
    fs.unlinkSync(path.join(tmpdir, "pages/components.tsx"));
  }

  await runCommand(
    `npm install --registry ${npmRegistry} --cache "${npmCache}"`,
    {
      dir: tmpdir,
      env: {
        npm_config_cache: npmCache,
        npm_config_tmp: npmTmp,
      },
    }
  );

  // Remove and install the designated next version
  await runCommand("npm uninstall next", { dir: tmpdir });
  await runCommand(`npm install next@${nextVersion} --cache "${npmCache}"`, {
    dir: tmpdir,
    env: {
      npm_config_cache: npmCache,
      npm_config_tmp: npmTmp,
    },
  });

  // Remove and install the designated @plasmicapp/loader-nextjs version
  await runCommand("npm uninstall @plasmicapp/loader-nextjs", {
    dir: tmpdir,
  });
  await runCommand(
    `npm install --registry ${
      loaderVersion !== "latest" ? "https://registry.npmjs.org" : npmRegistry
    } @plasmicapp/loader-nextjs@${loaderVersion} --cache "${npmCache}"`,
    {
      dir: tmpdir,
      env: {
        npm_config_cache: npmCache,
        npm_config_tmp: npmTmp,
      },
    }
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

  await new Promise((resolve) => setTimeout(resolve, 3000));

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      tmpdirCleanup();
      return;
    } catch (error: any) {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
}

export async function teardownNextJsServer(ctx: {
  server: ExecaChildProcess;
  host: string;
}) {
  const { server, host } = ctx;
  console.log(`Tearing down nextjs at ${host} (pid ${server.pid})...`);
  server.kill("SIGINT");

  try {
    await waitUntilServerDown(host, { maxTimeout: 10000 });
  } catch {
    server.kill("SIGTERM");
    try {
      await waitUntilServerDown(host, { maxTimeout: 5000 });
    } catch {
      server.kill("SIGKILL");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
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
