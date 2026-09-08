import execa from "execa";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export async function runCommand(
  command: string,
  opts: {
    dir?: string;
    env?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
) {
  opts.signal?.throwIfAborted();
  const child = execa.command(command, {
    cwd: opts.dir ?? process.cwd(),
    env: {
      ...process.env,
      npm_config_yes: "1",
      ...opts.env,
    },
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    // Give the command and its descendants their own process group on CI/Linux
    // and macOS, so a timed-out scaffold cannot keep installing in a deleted app.
    detached: process.platform !== "win32",
  });
  const abort = () => {
    if (process.platform !== "win32" && child.pid) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
          throw error;
        }
      }
    } else {
      child.kill("SIGKILL");
    }
  };
  opts.signal?.addEventListener("abort", abort, { once: true });
  try {
    return await child;
  } finally {
    opts.signal?.removeEventListener("abort", abort);
  }
}

export type TmpDir = { name: string; removeCallback: () => void };

export function getTempDir() {
  const name = mkdtempSync(path.join(tmpdir(), "plasmic-integration-"));
  return {
    name,
    removeCallback: () => rmSync(name, { recursive: true, force: true }),
  };
}
