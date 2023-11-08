import execa from "execa";
import { promises as fs } from "fs";
import path from "path";
import tmp from "tmp";
import credentials from "./.plasmic.auth.json";

export async function runCommand(
  command: string,
  opts: { dir?: string; env?: Record<string, string> } = {}
) {
  if (!opts.dir) opts.dir = process.cwd();
  if (!opts.env) opts.env = {};
  return execa.command(command, {
    cwd: opts.dir,
    env: {
      ...process.env,
      npm_config_yes: "1",
      ...opts.env,
    },
    stdio: "inherit",
  });
}

export const envAuthCredentials = {
  PLASMIC_AUTH_USER: credentials.user,
  PLASMIC_AUTH_TOKEN: credentials.token,
};

export function copyCredentials(authPath: string) {
  return fs.copyFile(path.join(__dirname, ".plasmic.auth.json"), authPath);
}

export function syncProject(dir: string, authDir?: string) {
  const params = [
    "sync",
    "--yes",
    "--projects=jrK3EHVDvsuNrYohN5Dhrt",
    authDir ? `--auth=${authDir}` : "",
  ].join(" ");
  return runCommand(`npx plasmic ${params}`, {
    dir,
  });
}

export function installPlasmicLoader(dir: string) {
  return runCommand("yarn add @plasmicapp/loader", {
    dir,
  });
}

export function buildProject(
  dir: string,
  envAuth: { [key: string]: string } = {}
) {
  return runCommand("npm run build", {
    dir,
    env: {
      ...envAuth,
    },
  });
}

export type TmpDir = { name: string; removeCallback: () => void };

export function getTempDir() {
  return tmp.dirSync({ unsafeCleanup: true });
}
