import { sync } from "../actions/sync";
import {
  expectProject1Components,
  expectProject1PlasmicJson,
  expectProjectAndDepPlasmicJson,
  mockApi,
  opts,
  project1Config,
  standardTestSetup,
  standardTestTeardown,
  tmpRepo,
} from "../test-common/fixtures";
import { MockComponent } from "../__mocks__/api";

jest.mock("../api");

// Reset the test project directory
beforeEach(() => {
  standardTestSetup();
});

afterEach(() => {
  // Remove the temporary directory
  // TODO: Comment out to keep files for debugging
  standardTestTeardown();
});

describe("versioned-sync", () => {
  test("syncs non-recursive case", async () => {
    opts.projects = ["projectId1"];
    opts.nonRecursive = true;
    await expect(sync(opts)).resolves.toBeUndefined();

    expectProject1Components();

    expect(tmpRepo.checkFile("./src/DepComponent.tsx")).toBeFalsy();

    // Check plasmic.json
    expectProject1PlasmicJson();
  });

  test("syncs missing components", async () => {
    opts.projects = ["projectId1"];
    opts.nonRecursive = true;
    // Simulates user deleting files by accident, since the project exists in plasmic.json,
    // but not in the project directory
    const plasmicJson = tmpRepo.readPlasmicJson();
    plasmicJson.projects.push(project1Config);
    tmpRepo.writePlasmicJson(plasmicJson);
    await expect(sync(opts)).resolves.toBeUndefined();
  });

  test("syncs down new names", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component name server-side
    const mockProject = mockApi.getMockProject("projectId1", "1.2.3");
    const buttonData = mockProject.components.find(
      (c: MockComponent) => c.id === "buttonId"
    );
    buttonData.name = "NewButton";
    mockProject.version = "2.0.0";
    mockApi.addMockProject(mockProject);
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();

    const plasmicJson = tmpRepo.readPlasmicJson();
    const projectInConfig = plasmicJson.projects.find(
      (p) => p.projectId === "projectId1"
    );
    const componentInConfig = !!projectInConfig
      ? projectInConfig.components.find((c) => c.id === buttonData.id)
      : undefined;
    expect(componentInConfig).toBeTruthy();
    expect(componentInConfig?.name).toEqual(buttonData.name);
  });

  test("syncs latest", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component version server-side
    const mockProject = mockApi.getMockProject("projectId1", "1.2.3");
    mockProject.version = "1.3.4";
    mockApi.addMockProject(mockProject);
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = mockApi.stringToMockComponent(
      tmpRepo.getComponentFileContents("projectId1", "buttonId")
    );
    expect(button).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("1.3.4");
  });

  test("syncs exact version", async () => {
    opts.projects = ["projectId1"];
    opts.nonRecursive = true;
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component version server-side
    const mockProject = mockApi.getMockProject("projectId1", "1.2.3");
    mockProject.version = "2.0.0";
    mockApi.addMockProject(mockProject);
    // Read in updated plasmic.json post-sync
    const plasmicJson = tmpRepo.readPlasmicJson();
    expect(plasmicJson.projects.length).toEqual(1); // projectId1
    expect(plasmicJson.projects[0].components.length).toEqual(2); // Container+Button
    // Try syncing non-existent version
    plasmicJson.projects[0].version = "1.2.10"; // Doesn't exist
    tmpRepo.writePlasmicJson(plasmicJson);
    await expect(sync(opts)).rejects.toThrow();
    // Try syncing existing version
    plasmicJson.projects[0].version = "2.0.0"; // Doesn't exist
    tmpRepo.writePlasmicJson(plasmicJson);
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = mockApi.stringToMockComponent(
      tmpRepo.getComponentFileContents("projectId1", "buttonId")
    );
    expect(button).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("2.0.0");
  });

  test("syncs according to semver", async () => {
    opts.projects = ["projectId1"];
    opts.nonRecursive = true;
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component version server-side
    const mockProject = mockApi.getMockProject("projectId1", "1.2.3");
    mockProject.version = "1.10.1";
    mockApi.addMockProject(mockProject);
    // Update plasmic.json to use semver
    const plasmicJson = tmpRepo.readPlasmicJson();
    expect(plasmicJson.projects.length).toEqual(1);
    expect(plasmicJson.projects[0].components.length).toEqual(2);
    plasmicJson.projects[0].version = "^1.2.3";
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = mockApi.stringToMockComponent(
      tmpRepo.getComponentFileContents("projectId1", "buttonId")
    );
    expect(button).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("1.10.1");
  });
});

describe("recursive-sync", () => {
  test("non-recursive base case", async () => {
    // Should sync both Button+Container because of the dependency
    opts.projects = ["projectId1"];
    opts.nonRecursive = true;
    await expect(sync(opts)).resolves.toBeUndefined();

    expectProject1Components();

    expect(tmpRepo.checkFile("./src/DepComponent.tsx")).toBeFalsy();

    expectProject1PlasmicJson();
  });

  test("dependencies base case", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    expect(tmpRepo.checkFile("./src/Button.tsx")).toBeTruthy();
    expect(tmpRepo.checkFile("./src/Container.tsx")).toBeTruthy();
    const depComponent = mockApi.stringToMockComponent(
      tmpRepo.getComponentFileContents("dependencyId1", "depComponentId")
    );
    expect(depComponent).toBeTruthy();
    expect(depComponent?.name).toEqual("DepComponent");
    expect(depComponent?.version).toEqual("2.3.4");

    // Check plasmic.json
    expectProjectAndDepPlasmicJson();
  });
});
