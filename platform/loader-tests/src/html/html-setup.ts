import { ExecaChildProcess } from "execa";
import { copySync } from "fs-extra";
import getPort from "get-port";
import path from "path";
import tmp from "tmp";
import {
  runCommand,
  uploadProject,
  waitUntilServerDown,
  waitUntilServerUp,
} from "../utils";

export interface HtmlContext {
  projectId: string;
  projectToken: string;
  tmpdir: string;
  tmpdirCleanup: () => void;
  server: ExecaChildProcess;
  host: string;
}

export async function setupHtml(opts: {
  bundleFile: string;
  projectName: string;
  codegenHost: string;
}): Promise<HtmlContext> {
  const { bundleFile, projectName, codegenHost } = opts;
  const { projectId, projectToken } = await uploadProject(
    bundleFile,
    projectName
  );
  const { name: tmpdir, removeCallback: tmpdirCleanup } = tmp.dirSync({
    unsafeCleanup: true,
  });

  console.log("tmpdir", tmpdir);
  const templateDir = path.resolve(path.join(__dirname, "template"));
  copySync(templateDir, tmpdir, { recursive: true });

  await runCommand(`yarn install`, { dir: tmpdir });

  const port = await getPort();
  const server = runCommand(`node -r esbuild-register main.ts`, {
    dir: tmpdir,
    noExit: true,
    env: {
      PORT: `${port}`,
      WAB_HOST: codegenHost,
      PROJECT_ID: projectId,
      PROJECT_TOKEN: projectToken,
    },
    output: "inherit",
  });
  const host = `http://localhost:${port}`;
  console.log(`Starting vanilla express at ${host} (pid ${server.pid})`);
  await waitUntilServerUp(host, {
    process: server,
  });
  console.log(`Started vanilla express at ${host} (pid ${server.pid})`);

  return {
    projectId,
    projectToken,
    tmpdir,
    tmpdirCleanup,
    server,
    host,
  };
}

export async function teardownHtml(ctx: HtmlContext) {
  const { server, host, tmpdirCleanup } = ctx;
  console.log(`Tearing down vanilla express at ${host} (pid ${server.pid})...`);
  server.kill("SIGINT");
  tmpdirCleanup();

  try {
    await waitUntilServerDown(host, { maxTimeout: 60000 });
  } catch {
    throw new Error(`Failed to shut down vanilla express server`);
  }
}
