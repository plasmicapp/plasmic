import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TmpDir, getTempDir, runCommand } from "./utils";

let dir: TmpDir;
beforeEach(() => {
  dir = getTempDir();
});
afterEach(() => dir.removeCallback());

it("runs commands in the requested directory with environment overrides", async () => {
  writeFileSync(
    path.join(dir.name, "script.cjs"),
    `require("node:fs").writeFileSync("result", process.env.INTEGRATION_VALUE)`
  );
  await runCommand("node script.cjs", {
    dir: dir.name,
    env: { INTEGRATION_VALUE: "ok" },
  });
  expect(readFileSync(path.join(dir.name, "result"), "utf8")).toBe("ok");
});

it("rejects when a command fails", async () => {
  writeFileSync(path.join(dir.name, "script.cjs"), "process.exit(42)");
  await expect(
    runCommand("node script.cjs", { dir: dir.name })
  ).rejects.toMatchObject({
    exitCode: 42,
  });
});

it.skipIf(process.platform === "win32")(
  "cancels the command and its descendants",
  async () => {
    writeFileSync(
      path.join(dir.name, "child.cjs"),
      `const fs = require("node:fs");
     fs.writeFileSync("ready", "");
     setTimeout(() => fs.writeFileSync("leaked", ""), 1000);`
    );
    writeFileSync(
      path.join(dir.name, "script.cjs"),
      `require("node:child_process").spawn(process.execPath, ["child.cjs"], { stdio: "inherit" });`
    );
    const controller = new AbortController();
    const result = runCommand("node script.cjs", {
      dir: dir.name,
      signal: controller.signal,
    }).catch((error) => error);
    try {
      await vi.waitFor(() =>
        expect(existsSync(path.join(dir.name, "ready"))).toBe(true)
      );
    } finally {
      controller.abort();
    }
    expect(await result).toMatchObject({ signal: "SIGKILL" });
    await setTimeout(1200);
    expect(existsSync(path.join(dir.name, "leaked"))).toBe(false);
  }
);
