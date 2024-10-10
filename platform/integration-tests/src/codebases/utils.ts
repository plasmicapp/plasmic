import execa from "execa";
import tmp from "tmp";

export async function runCommand(
  command: string,
  opts: { dir?: string; env?: Record<string, string> } = {}
) {
  if (!opts.dir) {
    opts.dir = process.cwd();
  }
  if (!opts.env) {
    opts.env = {};
  }
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
