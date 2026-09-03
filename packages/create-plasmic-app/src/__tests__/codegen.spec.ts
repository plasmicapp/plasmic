import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnOrFail } from "../utils/cmd-utils";
import { runCodegenSync } from "../utils/codegen";

vi.mock("../utils/cmd-utils", () => ({
  spawnOrFail: vi.fn().mockResolvedValue(undefined),
}));

describe("runCodegenSync", () => {
  let projectPath: string;

  beforeEach(() => {
    projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "cpa-codegen-test-"));
    fs.writeFileSync(path.join(projectPath, "plasmic.json"), "{}");
  });

  afterEach(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
    vi.mocked(spawnOrFail).mockClear();
  });

  it("passes the package manager to the first Plasmic sync", async () => {
    await runCodegenSync({
      projectId: "project-id",
      projectApiToken: undefined,
      projectPath,
      packageManager: "npm",
    });

    expect(spawnOrFail).toHaveBeenCalledWith(
      "npx plasmic sync --yes --package-manager=npm -p project-id",
      projectPath
    );
    expect(
      JSON.parse(
        fs.readFileSync(path.join(projectPath, "plasmic.json"), "utf8")
      )
    ).toMatchObject({ packageManager: "npm" });
  });
});
