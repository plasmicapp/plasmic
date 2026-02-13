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
  isAppRouter?: boolean;
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
    isAppRouter,
  } = opts;

  const npmRegistry = getEnvVar("NPM_CONFIG_REGISTRY");
  const codegenHost = getEnvVar("WAB_HOST");
  const pnpmStoreDir = "/tmp/.nextjs-loader-pnpm-store";

  copySync(templateDir, tmpdir, { recursive: true });

  if (removeComponentsPage && !isAppRouter) {
    fs.unlinkSync(path.join(tmpdir, "pages/components.tsx"));
  }

  // Update package.json next/loader-nextjs versions before installing
  const pkgJsonPath = path.join(tmpdir, "package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  pkgJson.dependencies["next"] = nextVersion;
  pkgJson.dependencies["@plasmicapp/loader-nextjs"] = loaderVersion;
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

  const loaderRegistry =
    loaderVersion !== "latest" ? "https://registry.npmjs.org" : npmRegistry;

  // Write .npmrc to configure registries for pnpm
  const npmrcLines = [
    `registry=${npmRegistry}`,
    `@plasmicapp:registry=${loaderRegistry}`,
    `store-dir=${pnpmStoreDir}`,
    `shamefully-hoist=true`,
  ];
  fs.writeFileSync(path.join(tmpdir, ".npmrc"), npmrcLines.join("\n") + "\n");

  await runCommand(`pnpm install --no-frozen-lockfile`, {
    dir: tmpdir,
    env: {
      COREPACK_ENABLE_STRICT: "0",
    },
  });

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

  if (isAppRouter) {
    // For app router, update plasmic-init.ts
    const initPath = path.join(tmpdir, "plasmic-init.ts");
    const initContent = fs.readFileSync(initPath);
    const adjustedInitContent = initContent
      .toString()
      .replace("undefined; // __DATA_HOST__", `"${codegenHost}";`);
    fs.writeFileSync(initPath, adjustedInitContent);
  } else {
    // For pages router, update pages/[[...catchall]].tsx
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
  env?: Record<string, string>;
}): Promise<NextJsContext> {
  const {
    bundleFile,
    projectName,
    removeComponentsPage,
    bundleTransformation,
    loaderVersion = "latest",
    nextVersion = "^12",
    dataSourceReplacement,
    env,
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
    tmpdir,
    env
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

  // TODO -- implement a way to identify/delete dependency projects. Without that, this leaves
  // dangling deps in the workspace
  // await removeProject(ctx.projectId);

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
  dir: string,
  envVars?: Record<string, string>
) {
  const template = env.template ?? "template-pages";
  const templateDir = path.resolve(path.join(__dirname, template));
  const isAppRouter = template.includes("template-app");

  await prepareTemplate({
    templateDir,
    tmpdir: dir,
    removeComponentsPage: env.removeComponentsPage,
    nextVersion: env.nextVersion,
    loaderVersion: env.loaderVersion,
    projectId: project.projectId,
    projectToken: project.projectToken,
    isAppRouter,
  });

  await runCommand(`pnpm run build`, {
    dir,
    env: { ...envVars, COREPACK_ENABLE_STRICT: "0" },
  });

  const port = await getPort();
  const nextServer = runCommand(
    `./node_modules/.bin/next start --port ${port}`,
    { dir, output: "inherit", noExit: true, env: envVars }
  );
  const host = `http://localhost:${port}`;
  await waitUntilServerUp(host, { process: nextServer });
  console.log(`Started nextjs server at ${host} (pid ${nextServer.pid})`);

  return {
    server: nextServer,
    host,
  };
}
