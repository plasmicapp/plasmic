import { MockComponent } from "../__mocks__/api";
import { sync } from "../actions/sync";
import {
  expectComponent,
  expectDepComponents,
  expectProject1Components,
  mockApi,
  opts,
  project1Config,
  standardTestSetup,
  standardTestTeardown,
  tmpRepo,
} from "../test-common/fixtures";

jest.mock("../api");

describe("sync", () => {
  beforeEach(() => {
    standardTestSetup();
  });

  afterEach(() => {
    standardTestTeardown();
  });

  test("syncs project without dependencies (non-recursive)", async () => {
    opts.projects = ["projectId1"];
    opts.nonRecursive = true;
    await expect(sync(opts)).resolves.toBeUndefined();
    expectProject1Components();
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
    expectProject1Components();
  });

  test("syncs down new names", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component name server-side
    const mockProject = mockApi.getMockProject("projectId1", "main", "1.2.3");
    const buttonData = mockProject.components.find(
      (c: MockComponent) => c.id === "buttonId"
    );
    buttonData.name = "NewButton";
    mockProject.version = "2.0.0";
    mockApi.addMockProject(mockProject);
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();

    expectComponent({
      projectId: "projectId1",
      projectVersion: "2.0.0",
      id: "buttonId",
      name: "NewButton",
      cssPath: "plasmic/project_id_1/PlasmicNewButton.css",
      renderPath: "plasmic/project_id_1/PlasmicNewButton.tsx",
      skeletonPath: "NewButton.tsx",
      skeletonVersion: "2.0.0", // skeleton changes on rename
    });
    expectComponent({
      projectId: "projectId1",
      projectVersion: "2.0.0",
      id: "containerId",
      name: "Container",
      cssPath: "plasmic/project_id_1/PlasmicContainer.css",
      renderPath: "plasmic/project_id_1/PlasmicContainer.tsx",
      skeletonPath: "Container.tsx",
      skeletonVersion: "1.2.3", // skeleton does not change
    });

    // we don't delete old files
    expect(
      tmpRepo.readFile("src/plasmic/project_id_1/PlasmicButton.css")
    ).toBeTruthy();
    expect(
      tmpRepo.readFile("src/plasmic/project_id_1/PlasmicButton.tsx")
    ).toBeTruthy();
    expect(tmpRepo.readFile("src/Button.tsx")).toBeTruthy();
  });

  test("syncs latest", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component version server-side
    const mockProject = mockApi.getMockProject("projectId1", "main", "1.2.3");
    mockProject.version = "1.3.4";
    mockApi.addMockProject(mockProject);
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = mockApi.stringToMockComponent(
      tmpRepo.readGeneratedComponentFiles("projectId1", "buttonId").render
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
    const mockProject = mockApi.getMockProject("projectId1", "main", "1.2.3");
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
      tmpRepo.readGeneratedComponentFiles("projectId1", "buttonId").render
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
    const mockProject = mockApi.getMockProject("projectId1", "main", "1.2.3");
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
      tmpRepo.readGeneratedComponentFiles("projectId1", "buttonId").render
    );
    expect(button).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("1.10.1");
  });
});

describe("sync with dependencies", () => {
  beforeEach(() => {
    standardTestSetup(true);
  });

  afterEach(() => {
    standardTestTeardown();
  });

  test("does not sync project without dependency (non-recursive)", async () => {
    opts.projects = ["projectId1"];
    opts.nonRecursive = true;
    await expect(sync(opts)).rejects.toThrow(
      'Please run "plasmic sync" without the --non-recursive flag to sync dependencies.'
    );
    expect(tmpRepo.readPlasmicJson().projects).toHaveLength(0);
  });

  test("syncs dependency (non-recursive)", async () => {
    opts.projects = ["dependencyId1"];
    opts.nonRecursive = true;
    await expect(sync(opts)).resolves.toBeUndefined();
    expect(tmpRepo.readPlasmicJson().projects).toHaveLength(1);
    expectDepComponents();
  });

  test("syncs project with dependency included", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    expect(tmpRepo.readPlasmicJson().projects).toHaveLength(2);
    expectDepComponents();
    expectProject1Components({ includeDep: true });
  });

  describe("dependency name change", () => {
    beforeEach(async () => {
      // Initial sync
      opts.projects = ["projectId1"];
      await expect(sync(opts)).resolves.toBeUndefined();
      // Change component name server-side
      const depProject = mockApi.getMockProject(
        "dependencyId1",
        "main",
        "2.3.4"
      );
      const depComponentData = depProject.components.find(
        (c: MockComponent) => c.id === "depComponentId"
      );
      depComponentData.name = "NewDepComponent";
      depProject.version = "3.0.0";
      mockApi.addMockProject(depProject);
    });

    afterEach(() => {
      // Dependency project is updated
      expectComponent({
        projectId: "dependencyId1",
        projectVersion: "3.0.0",
        id: "depComponentId",
        name: "NewDepComponent",
        cssPath: "plasmic/dependency_id_1/PlasmicNewDepComponent.css",
        renderPath: "plasmic/dependency_id_1/PlasmicNewDepComponent.tsx",
        skeletonPath: "NewDepComponent.tsx",
        skeletonVersion: "3.0.0",
      });

      // Don't delete old DepComponent files
      expect(
        tmpRepo.readFile("src/plasmic/dependency_id_1/PlasmicDepComponent.css")
      ).toBeTruthy();
      expect(
        tmpRepo.readFile("src/plasmic/dependency_id_1/PlasmicDepComponent.tsx")
      ).toBeTruthy();
      expect(tmpRepo.readFile("src/DepComponent.tsx")).toBeTruthy();
    });

    test("when syncing dependency only", async () => {
      // Sync only dependency project
      opts.projects = ["dependencyId1"];
      await expect(sync(opts)).resolves.toBeUndefined();

      // Project is the same and will include imports to the old DepComponent
      expectProject1Components({ includeDep: true });
    });

    test("when syncing project with dependency version upgrade", async () => {
      // In main project, upgrade to dependency version 3.0.0 and bump to 1.2.4
      const project = mockApi.getMockProject("projectId1", "main", "1.2.3");
      project.dependencies = { dependencyId1: "3.0.0" };
      project.version = "1.2.4";
      mockApi.addMockProject(project);

      // Sync main project again
      opts.projects = ["projectId1"];
      await expect(sync(opts)).resolves.toBeUndefined();

      // Project should start using NewDepComponent
      const depComponents = [
        {
          id: "depComponentId",
          name: "NewDepComponent",
          importAs: "NewDepComponent",
        },
      ];
      expectComponent({
        projectId: "projectId1",
        projectVersion: "1.2.4",
        id: "buttonId",
        name: "Button",
        cssPath: "plasmic/project_id_1/PlasmicButton.css",
        renderPath: "plasmic/project_id_1/PlasmicButton.tsx",
        skeletonPath: "Button.tsx",
        skeletonVersion: "1.2.3",
        depComponents,
      });
      expectComponent({
        projectId: "projectId1",
        projectVersion: "1.2.4",
        id: "containerId",
        name: "Container",
        cssPath: "plasmic/project_id_1/PlasmicContainer.css",
        renderPath: "plasmic/project_id_1/PlasmicContainer.tsx",
        skeletonPath: "Container.tsx",
        skeletonVersion: "1.2.3",
        depComponents,
      });
    });
  });
});
