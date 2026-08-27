import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { sync } from "../actions/sync";
import {
  opts,
  standardTestSetup,
  standardTestTeardown,
  tmpRepo,
} from "../test-common/fixtures";
import { ensure } from "../utils/lang-utils";

vi.mock("../api");

// Lets a test take over `askChoice` without changing the default behavior of
// the prompts the rest of the sync flow relies on.
let askChoiceImpl: ((question: any) => any) | undefined;

vi.mock("../utils/prompts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/prompts")>();
  return {
    ...actual,
    askChoice: (question: any) =>
      askChoiceImpl ? askChoiceImpl(question) : actual.askChoice(question),
  };
});

beforeEach(() => {
  standardTestSetup(false);
});

afterEach(() => {
  askChoiceImpl = undefined;
  standardTestTeardown();
});

function buttonRenderModulePath() {
  const config = tmpRepo.readPlasmicJson();
  const project = ensure(
    config.projects.find((p) => p.projectId === "projectId1")
  );
  return ensure(project.components.find((c) => c.id === "buttonId"))
    .renderModuleFilePath;
}

describe("restoring moved file paths", () => {
  test("records a relative path when the user picks among duplicate basenames", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();

    const srcDir = tmpRepo.readPlasmicJson().srcDir;
    const originalPath = buttonRenderModulePath();
    const baseName = path.basename(originalPath);

    // Move the render module, and leave a decoy with the same basename, so the
    // recorded path is missing and two files match it.
    const movedPath = path.join("moved", baseName);
    const contents = tmpRepo.readFile(path.join(srcDir, originalPath));
    for (const relPath of [movedPath, path.join("decoy", baseName)]) {
      const srcDirRelPath = path.join(srcDir, relPath);
      // tmpRepo.writeFile does not create parent directories.
      fs.mkdirSync(path.dirname(tmpRepo.resolveFile(srcDirRelPath)), {
        recursive: true,
      });
      tmpRepo.writeFile(srcDirRelPath, contents);
    }
    tmpRepo.deleteFile(path.join(srcDir, originalPath));

    // On multiple matches the CLI asks the user to choose, and the choices it
    // offers are absolute paths.
    let offeredChoices: string[] = [];
    askChoiceImpl = (question) => {
      // glob emits forward slashes regardless of platform.
      const picked = question.choices.find(
        (c: unknown) => typeof c === "string" && c.endsWith(`moved/${baseName}`)
      );
      if (!picked) {
        return question.defaultAnswer;
      }
      offeredChoices = question.choices;
      return picked;
    };

    await expect(sync(opts)).resolves.toBeUndefined();

    expect(offeredChoices.length).toBeGreaterThan(1);
    expect(offeredChoices.some((c) => path.isAbsolute(c))).toBe(true);

    // The chosen path must be stored relative to srcDir, otherwise plasmic.json
    // only resolves on the machine that ran the sync.
    const restoredPath = buttonRenderModulePath();
    expect(path.isAbsolute(restoredPath)).toBe(false);
    expect(restoredPath).toBe(movedPath);
    expect(tmpRepo.checkFile(path.join(srcDir, restoredPath))).toBe(true);
  });
});
