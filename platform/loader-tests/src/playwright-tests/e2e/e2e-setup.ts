import { ExecaChildProcess } from "execa";
import fs from "fs";
import getPort from "get-port";
import path from "path";
import tmp from "tmp";
import { getEnvVar } from "../../env";
import { teardownNextJs } from "../../nextjs/nextjs-setup";
import {
  getApiToken,
  runCommand,
  uploadProject,
  waitUntilServerUp,
} from "../../utils";
export type CodegenPlatform = "nextjs" | "react" | "tanstack";

export interface CodegenTestContext {
  projectId: string;
  projectToken: string;
  projectDir: string;
  tmpdir: string;
  tmpdirCleanup: () => void;
  server: ExecaChildProcess;
  host: string;
  port: number;
}

export type Scheme = "codegen" | "loader";

export interface CodegenTestOptions {
  bundleFile: string;
  projectName: string;
  platform: CodegenPlatform;
  scheme: Scheme;
  appDir?: boolean;
  typescript?: boolean;
  bundleTransformation?: (value: string) => string;
}

export async function setupCodegenTest(
  opts: CodegenTestOptions
): Promise<CodegenTestContext> {
  const {
    bundleFile,
    projectName,
    platform,
    scheme,
    appDir = false,
    typescript = true,
    bundleTransformation,
  } = opts;

  const { projectId, projectToken } = await uploadProject(
    bundleFile,
    projectName,
    { bundleTransformation }
  );
  console.log(`[codegen-setup] Uploaded project: ${projectId}`);

  const { name: tmpdir, removeCallback: tmpdirCleanup } = tmp.dirSync({
    unsafeCleanup: true,
  });
  console.log(`[codegen-setup] Created tmpdir: ${tmpdir}`);

  const npmRegistry = getEnvVar("NPM_CONFIG_REGISTRY");
  const npmCache = path.join(tmpdir, ".npm-cache");
  const env = {
    npm_config_registry: npmRegistry,
    npm_config_cache: npmCache,
    PLASMIC_AUTH_HOST: getEnvVar("WAB_HOST"),
    PLASMIC_AUTH_USER: getEnvVar("WAB_USER_EMAIL"),
    PLASMIC_AUTH_TOKEN: await getApiToken(),
  };

  const projectDir = await runCreatePlasmicApp({
    outputDir: tmpdir,
    projectName: projectName.replace(/\s/g, "-").toLowerCase(),
    platform,
    scheme,
    appDir,
    typescript,
    projectId,
    projectApiToken: projectToken,
    env,
  });
  console.log(`[codegen-setup] CPA created project at: ${projectDir}`);

  if (scheme === "loader") {
    patchLoaderHost(projectDir, platform, typescript, getEnvVar("WAB_HOST"));
  }

  const { server, host, port } = await buildAndStartServer(
    projectDir,
    platform,
    env
  );
  console.log(`[codegen-setup] Server running at ${host} (pid ${server.pid})`);

  return {
    projectId,
    projectToken,
    projectDir,
    tmpdir,
    tmpdirCleanup,
    server,
    host,
    port,
  };
}

export async function teardownCodegenTest(ctx: CodegenTestContext) {
  await teardownNextJs(ctx);
}

export async function runCreatePlasmicApp(opts: {
  outputDir: string;
  projectName: string;
  platform: string;
  scheme: string;
  appDir?: boolean;
  typescript?: boolean;
  projectId: string;
  projectApiToken: string;
  env?: Record<string, string>;
}): Promise<string> {
  const {
    outputDir,
    projectName,
    platform,
    scheme,
    appDir = false,
    typescript = true,
    projectId,
    projectApiToken,
    env = {},
  } = opts;

  const args = [
    "npx",
    "create-plasmic-app",
    projectName,
    `--platform=${platform}`,
    `--scheme=${scheme}`,
    `--projectId=${projectId}`,
    `--projectApiToken=${projectApiToken}`,
    typescript ? "--typescript" : "--typescript=false",
  ];

  if (platform === "nextjs") {
    args.push(appDir ? "--appDir" : "--appDir=false");
  }

  const command = args.join(" ");

  console.log(`[codegen-setup] Running CPA: ${command}`);

  await runCommand(command, {
    dir: outputDir,
    output: "inherit",
    env,
  });

  const projectDir = path.join(outputDir, projectName);

  if (!fs.existsSync(projectDir)) {
    throw new Error(`CPA failed to create project at ${projectDir}`);
  }

  return projectDir;
}

function getStartCommand(platform: CodegenPlatform, port: number): string {
  let npmScriptName;
  switch (platform) {
    case "nextjs":
      npmScriptName = "start";
      break;
    // case "gatsby":
    //   npmScriptName = "serve";
    //   break;
    case "react":
    case "tanstack":
      npmScriptName = "preview";
      break;
  }
  return `npm run ${npmScriptName} -- --port ${port}`;
}

/**
 * E2E tests run against a self-hosted codegen server, but the generated
 * loader config does not include the host. We patch the config to point
 * to the self-hosted codegen server.
 */
function patchLoaderHost(
  projectDir: string,
  platform: CodegenPlatform,
  typescript: boolean,
  host: string
) {
  const ext = typescript ? "ts" : "js";
  const filePath =
    platform === "nextjs"
      ? path.join(projectDir, `plasmic-init.${ext}`)
      : path.join(projectDir, `gatsby-config.${ext}`);
  const content = fs.readFileSync(filePath, "utf-8");
  fs.writeFileSync(
    filePath,
    content.replace("projects: [", `host: "${host}",\n    projects: [`)
  );
  console.log(`[codegen-setup] Patched loader host in ${filePath}`);
}

async function buildAndStartServer(
  projectDir: string,
  platform: CodegenPlatform,
  env: Record<string, string> = {}
): Promise<{ server: ExecaChildProcess; host: string; port: number }> {
  console.log(`[codegen-setup] Building ${platform} project...`);
  await runCommand("npm run build", {
    dir: projectDir,
    env,
  });

  const port = await getPort();
  const startCmd = getStartCommand(platform, port);
  console.log(`[codegen-setup] Starting ${platform} server on port ${port}...`);

  const server = runCommand(startCmd, {
    dir: projectDir,
    output: "inherit",
    noExit: true,
    env,
  });

  const host = `http://localhost:${port}`;

  await waitUntilServerUp(host, { process: server, maxTimeout: 10000 });
  console.log(`[codegen-setup] Server is up at ${host}`);

  return { server, host, port };
}
