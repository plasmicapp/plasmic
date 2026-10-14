import path from "upath";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  MockComponent,
  addMockProject,
  getMockProject,
  stringToMockComponent,
} from "../__mocks__/api";
import { ensure } from "../utils/lang-utils";
import {
  expectProject1Components,
  expectProject1PlasmicJson,
  expectProjectAndDepPlasmicJson,
  opts,
  project1Config,
  standardTestSetup,
  standardTestTeardown,
  tmpRepo,
} from "./__testonly__/fixtures";
import { sync } from "./sync";

vi.mock("../api");

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
    const oldButtonConfig = ensure(
      tmpRepo
        .readPlasmicJson()
        .projects.find((p) => p.projectId === "projectId1")
        ?.components.find((c) => c.id === "buttonId"),
      "Button should be in plasmic.json after the first sync"
    );
    const oldButtonFiles = [
      oldButtonConfig.renderModuleFilePath,
      oldButtonConfig.cssFilePath,
      oldButtonConfig.importSpec.modulePath,
    ].map((p) => path.join("src", p));
    for (const oldFile of oldButtonFiles) {
      expect(tmpRepo.checkFile(oldFile)).toBeTruthy();
    }
    // The skeleton is owned by the user; pretend they worked on it
    const oldSkeletonFile = path.join(
      "src",
      oldButtonConfig.importSpec.modulePath
    );
    tmpRepo.writeFile(
      oldSkeletonFile,
      tmpRepo.readFile(oldSkeletonFile) + "\nexport const clicks = 1;\n"
    );

    // Change component name server-side
    const mockProject = ensure(getMockProject("projectId1", "main", "1.2.3"));
    const buttonData = ensure(
      mockProject.components.find((c: MockComponent) => c.id === "buttonId")
    );
    buttonData.name = "NewButton";
    mockProject.version = "2.0.0";
    addMockProject(mockProject);
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();

    const plasmicJson = tmpRepo.readPlasmicJson();
    const projectInConfig = plasmicJson.projects.find(
      (p) => p.projectId === "projectId1"
    );
    const componentInConfig = projectInConfig
      ? projectInConfig.components.find((c) => c.id === buttonData.id)
      : undefined;
    expect(componentInConfig).toBeTruthy();
    expect(componentInConfig?.name).toEqual(buttonData.name);

    // Files generated under the old name should be gone, not left behind
    for (const oldFile of oldButtonFiles) {
      expect(tmpRepo.checkFile(oldFile)).toBeFalsy();
    }
    const button = stringToMockComponent(
      tmpRepo.getComponentFileContents("projectId1", "buttonId")
    );
    expect(button?.name).toEqual("NewButton");
    // The skeleton followed the component, edits included
    const newSkeletonFile = path.join(
      "src",
      ensure(componentInConfig, "checked above").importSpec.modulePath
    );
    expect(newSkeletonFile).toEqual("src/NewButton.tsx");
    expect(tmpRepo.readFile(newSkeletonFile)).toContain(
      "export const clicks = 1;"
    );
  });

  test("syncs renames that overlap", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    tmpRepo.writeFile(
      "src/Button.tsx",
      tmpRepo.readFile("src/Button.tsx") + "\nexport const fromButton = 1;\n"
    );
    tmpRepo.writeFile(
      "src/Container.tsx",
      tmpRepo.readFile("src/Container.tsx") +
        "\nexport const fromContainer = 1;\n"
    );

    // Button takes over Container's name while Container moves on to Container2.
    // Button is synced first, so without care it would land on files that
    // still belong to Container.
    const mockProject = ensure(
      getMockProject("projectId1", "main", "1.2.3"),
      "project1 should be in the mock server"
    );
    ensure(
      mockProject.components.find((c: MockComponent) => c.id === "buttonId"),
      "Button should be in the mock project"
    ).name = "Container";
    ensure(
      mockProject.components.find((c: MockComponent) => c.id === "containerId"),
      "Container should be in the mock project"
    ).name = "Container2";
    mockProject.version = "2.0.0";
    addMockProject(mockProject);
    await expect(sync(opts)).resolves.toBeUndefined();

    expect(
      stringToMockComponent(
        tmpRepo.getComponentFileContents("projectId1", "buttonId")
      )
    ).toMatchObject({ id: "buttonId", name: "Container" });
    expect(
      stringToMockComponent(
        tmpRepo.getComponentFileContents("projectId1", "containerId")
      )
    ).toMatchObject({ id: "containerId", name: "Container2" });
    expect(tmpRepo.readFile("src/Container.tsx")).toContain(
      "export const fromButton = 1;"
    );
    expect(tmpRepo.readFile("src/Container2.tsx")).toContain(
      "export const fromContainer = 1;"
    );
    expect(tmpRepo.checkFile("src/Button.tsx")).toBeFalsy();
    expect(
      tmpRepo.checkFile("src/plasmic/project_id_1/PlasmicButton.tsx")
    ).toBeFalsy();
    expect(
      tmpRepo.checkFile("src/plasmic/project_id_1/PlasmicButton.css")
    ).toBeFalsy();
    expect(
      tmpRepo.checkFile("src/plasmic/project_id_1/PlasmicContainer.tsx")
    ).toBeTruthy();
    expect(
      tmpRepo.checkFile("src/plasmic/project_id_1/PlasmicContainer2.tsx")
    ).toBeTruthy();
  });

  test("syncs two components swapping names", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    tmpRepo.writeFile(
      "src/Button.tsx",
      tmpRepo.readFile("src/Button.tsx") + "\nexport const fromButton = 1;\n"
    );
    tmpRepo.writeFile(
      "src/Container.tsx",
      tmpRepo.readFile("src/Container.tsx") +
        "\nexport const fromContainer = 1;\n"
    );

    const mockProject = ensure(
      getMockProject("projectId1", "main", "1.2.3"),
      "project1 should be in the mock server"
    );
    ensure(
      mockProject.components.find((c: MockComponent) => c.id === "buttonId"),
      "Button should be in the mock project"
    ).name = "Container";
    ensure(
      mockProject.components.find((c: MockComponent) => c.id === "containerId"),
      "Container should be in the mock project"
    ).name = "Button";
    mockProject.version = "2.0.0";
    addMockProject(mockProject);
    await expect(sync(opts)).resolves.toBeUndefined();

    expect(
      stringToMockComponent(
        tmpRepo.getComponentFileContents("projectId1", "buttonId")
      )
    ).toMatchObject({ id: "buttonId", name: "Container" });
    expect(
      stringToMockComponent(
        tmpRepo.getComponentFileContents("projectId1", "containerId")
      )
    ).toMatchObject({ id: "containerId", name: "Button" });
    expect(tmpRepo.readFile("src/Container.tsx")).toContain(
      "export const fromButton = 1;"
    );
    expect(tmpRepo.readFile("src/Button.tsx")).toContain(
      "export const fromContainer = 1;"
    );
  });

  test("syncs latest", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component version server-side
    const mockProject = ensure(getMockProject("projectId1", "main", "1.2.3"));
    mockProject.version = "1.3.4";
    addMockProject(mockProject);
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = stringToMockComponent(
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
    const mockProject = ensure(getMockProject("projectId1", "main", "1.2.3"));
    mockProject.version = "2.0.0";
    addMockProject(mockProject);
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
    const button = stringToMockComponent(
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
    const mockProject = ensure(getMockProject("projectId1", "main", "1.2.3"));
    mockProject.version = "1.10.1";
    addMockProject(mockProject);
    // Update plasmic.json to use semver
    const plasmicJson = tmpRepo.readPlasmicJson();
    expect(plasmicJson.projects.length).toEqual(1);
    expect(plasmicJson.projects[0].components.length).toEqual(2);
    plasmicJson.projects[0].version = "^1.2.3";
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = stringToMockComponent(
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
    const depComponent = stringToMockComponent(
      tmpRepo.getComponentFileContents("dependencyId1", "depComponentId")
    );
    expect(depComponent).toBeTruthy();
    expect(depComponent?.name).toEqual("DepComponent");
    expect(depComponent?.version).toEqual("2.3.4");

    // Check plasmic.json
    expectProjectAndDepPlasmicJson();
  });
});
