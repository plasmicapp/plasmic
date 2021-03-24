jest.mock("../api");
import { sync } from "../actions/sync";
import {
  expectProject1Components,
  expectProject1PlasmicJson,
  opts,
  standardTestSetup,
  standardTestTeardown,
  tmpRepo,
} from "../test-common/fixtures";

// Reset the test project directory
beforeEach(() => {
  standardTestSetup(false);
});

afterEach(() => {
  standardTestTeardown();
});

describe("first-time-user-experience", () => {
  test("missing auth", async () => {
    // Trying to sync is going to fail without a valid auth file
    tmpRepo.deletePlasmicAuth();
    await expect(sync(opts)).rejects.toThrow();
  });

  test("no args", async () => {
    // No projects or components specified
    await expect(sync(opts)).rejects.toThrow();
  });

  test("specify project", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();

    expectProject1Components();

    expect(tmpRepo.checkFile("./src/DepComponent.tsx")).toBeFalsy();

    expectProject1PlasmicJson();
  });
});
