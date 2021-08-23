import { spawn } from "./npm-utils";

/**
 * Run a command synchronously
 * @returns
 */
export async function spawnOrFail(
  cmd: string,
  workingDir?: string,
  customErrorMsg?: string
): Promise<void> {
  const result = await spawn(cmd, workingDir);
  if (!result) {
    throw new Error(customErrorMsg ?? `Failed to run "${cmd}"`);
  }
}
