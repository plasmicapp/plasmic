jest.mock("../api");
const mockApi = require("../api");
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
import L from "lodash";
import * as semver from "semver";
import { sync, SyncArgs } from "../actions/sync";
import { AUTH_FILE_NAME, CONFIG_FILE_NAME } from "../utils/config-utils";
import { MockComponent } from "../__mocks__/api";
import { PlasmicConfig } from "../utils/config-utils";
import { isExportDeclaration } from "typescript";

let opts: SyncArgs; // Options to pass to sync
let plasmicJson: PlasmicConfig; // plasmic.json
let tmpDir: tmp.DirResult; // Temporary directory used for tests

function resolveFile(relativePath: string): string {
  return path.resolve(tmpDir.name, relativePath);
}

function readFile(relativePath: string): string {
  const absPath = resolveFile(relativePath);
  const buf = fs.readFileSync(absPath);
  return buf.toString();
}

function getMockComponentFromFile(
  projectId: string,
  componentId: string
): MockComponent | undefined {
  const plasmicJson: PlasmicConfig = JSON.parse(readFile(CONFIG_FILE_NAME));
  const srcDir = plasmicJson.srcDir;
  const projectConfig = plasmicJson.projects.find(
    p => p.projectId === projectId
  );
  if (!projectConfig) {
    return;
  }
  const componentConfig = projectConfig.components.find(
    c => c.id === componentId
  );
  if (!componentConfig) {
    return;
  }
  const data = readFile(
    path.join(srcDir, componentConfig.renderModuleFilePath)
  );
  return mockApi.stringToMockComponent(data);
}

function checkFile(relativePath: string): boolean {
  const absPath = resolveFile(relativePath);
  try {
    const stats = fs.statSync(absPath);
    return !!stats ? true : false;
  } catch (e) {
    return false;
  }
}

// Reset the test project directory
beforeEach(() => {
  tmpDir = tmp.dirSync({ unsafeCleanup: true });
  const plasmicJsonFile = resolveFile(CONFIG_FILE_NAME);
  const plasmicAuthFile = resolveFile(AUTH_FILE_NAME);
  // Default opts and config
  opts = {
    projects: ["projectId1"],
    components: [],
    onlyExisting: false,
    forceOverwrite: true,
    newComponentScheme: "blackbox",
    appendJsxOnMissingBase: false,
    recursive: false,
    includeDependencies: false,
    nonInteractive: true,
    config: plasmicJsonFile,
    auth: plasmicAuthFile
  };
  // Setup server-side mock data
  const depComponent = {
    id: "depComponentId",
    name: "DepComponent",
    projectId: "dependencyId1",
    version: "2.3.4",
    children: []
  };
  const button = {
    id: "buttonId",
    name: "Button",
    projectId: "projectId1",
    version: "1.2.3",
    children: [depComponent]
  };
  const container = {
    id: "containerId",
    name: "Container",
    projectId: "projectId1",
    version: "1.2.3",
    children: [button]
  };
  const components: MockComponent[] = [button, container, depComponent];
  components.forEach(c => mockApi.setMockComponent(c.id, c));

  // Setup client-side directory
  plasmicJson = {
    platform: "react",
    code: {
      lang: "ts",
      scheme: "blackbox"
    },
    style: {
      scheme: "css",
      defaultStyleCssFilePath: "plasmic/PP__plasmic__default_style.css"
    },
    tokens: {
      scheme: "theo",
      tokensFilePath: "plasmic-tokens.theo.json"
    },
    srcDir: "src/",
    defaultPlasmicDir: "./plasmic",
    projects: [],
    globalVariants: {
      variantGroups: []
    },
    cliVersion: "0.1.44"
  };
  const plasmicAuth = {
    host: "http://localhost:3003",
    user: "yang@plasmic.app",
    token: "faketoken"
  };
  fs.writeFileSync(plasmicJsonFile, JSON.stringify(plasmicJson));
  fs.writeFileSync(plasmicAuthFile, JSON.stringify(plasmicAuth));
});

afterEach(() => {
  // Remove the temporary directory
  // TODO: Comment out to keep files for debugging
  tmpDir.removeCallback();
});

describe("versioned-sync", () => {
  test("syncs normal case", async () => {
    opts.components = ["buttonId", "containerId"];
    opts.recursive = false;
    opts.includeDependencies = false;
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = getMockComponentFromFile("projectId1", "buttonId");
    const container = getMockComponentFromFile("projectId1", "containerId");
    // Check correct files exist
    expect(button).toBeTruthy();
    expect(container).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("1.2.3");
    expect(container?.name).toEqual("Container");
    expect(container?.version).toEqual("1.2.3");
    expect(checkFile("./src/DepComponent.tsx")).toBeFalsy();

    // Check plasmic.json
    const plasmicJson: PlasmicConfig = JSON.parse(readFile(CONFIG_FILE_NAME));
    expect(plasmicJson.projects.length).toEqual(1);
    const projectConfig = plasmicJson.projects[0];
    expect(projectConfig.components.length).toEqual(2);
    const componentNames = projectConfig.components.map(c => c.name);
    expect(componentNames).toContain("Button");
    expect(componentNames).toContain("Container");
  });

  test("syncs missing components", async () => {
    opts.components = ["buttonId", "containerId"];
    // Simulates user deleting files by accident, since the project exists in plasmic.json,
    // but not in the project directory
    plasmicJson.projects.push({
      projectId: "projectId1",
      projectName: "Project 1",
      version: "latest",
      cssFilePath: "plasmic/PP__demo.css",
      components: [
        {
          id: "buttonId",
          name: "Button",
          type: "managed",
          projectId: "projectId1",
          renderModuleFilePath: "plasmic/project_id_1/PlasmicButton.tsx",
          importSpec: {
            modulePath: "Button.tsx"
          },
          cssFilePath: "plasmic/PlasmicButton.css",
          scheme: "blackbox"
        }
      ],
      icons: []
    });
    fs.writeFileSync(opts.config as string, JSON.stringify(plasmicJson));
    await expect(sync(opts)).rejects.toThrow();
  });

  test("syncs down new names", async () => {
    opts.components = ["buttonId", "containerId"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component name server-side
    const buttonData = mockApi.getMockComponentById("buttonId");
    buttonData.name = "NewButton";
    mockApi.setMockComponent("buttonId", buttonData);
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();

    const plasmicJson: PlasmicConfig = JSON.parse(readFile(CONFIG_FILE_NAME));
    const projectInConfig = plasmicJson.projects.find(
      p => p.projectId === "projectId1"
    );
    const componentInConfig = !!projectInConfig
      ? projectInConfig.components.find(c => c.id === buttonData.id)
      : undefined;
    expect(componentInConfig).toBeTruthy();
    expect(componentInConfig?.name).toEqual(buttonData.name);
  });

  test("syncs latest", async () => {
    opts.components = ["buttonId"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component version server-side
    const buttonData = mockApi.getMockComponentById("buttonId");
    buttonData.version = "2.0.0";
    mockApi.setMockComponent("buttonId", buttonData);
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = getMockComponentFromFile("projectId1", "buttonId");
    expect(button).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("2.0.0");
  });

  test("syncs exact version", async () => {
    opts.components = ["buttonId"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component version server-side
    const buttonData = mockApi.getMockComponentById("buttonId");
    buttonData.version = "2.0.0";
    mockApi.setMockComponent("buttonId", buttonData);
    // Read in updated plasmic.json post-sync
    const plasmicJson: PlasmicConfig = JSON.parse(readFile(CONFIG_FILE_NAME));
    expect(plasmicJson.projects.length).toEqual(1); // projectId1
    expect(plasmicJson.projects[0].components.length).toEqual(1); // Button
    // Try syncing non-existent version
    plasmicJson.projects[0].version = "1.2.10"; // Doesn't exist
    fs.writeFileSync(opts.config as string, JSON.stringify(plasmicJson));
    await expect(sync(opts)).rejects.toThrow();
    // Try syncing existing version
    plasmicJson.projects[0].version = "2.0.0"; // Doesn't exist
    fs.writeFileSync(opts.config as string, JSON.stringify(plasmicJson));
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = getMockComponentFromFile("projectId1", "buttonId");
    expect(button).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("2.0.0");
  });

  test("syncs according to semver", async () => {
    opts.components = ["buttonId"];
    await expect(sync(opts)).resolves.toBeUndefined();
    // Change component version server-side
    const buttonData = mockApi.getMockComponentById("buttonId");
    buttonData.version = "1.10.1";
    mockApi.setMockComponent("buttonId", buttonData);
    // Update plasmic.json to use semver
    const plasmicJson: PlasmicConfig = JSON.parse(readFile(CONFIG_FILE_NAME));
    expect(plasmicJson.projects.length).toEqual(1);
    expect(plasmicJson.projects[0].components.length).toEqual(1);
    plasmicJson.projects[0].version = "^1.2.3";
    // Try syncing again and see if things show up
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = getMockComponentFromFile("projectId1", "buttonId");
    expect(button).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("1.10.1");
  });
});

describe("recursive-sync", () => {
  test("recursive base case", async () => {
    // Should sync both Button+Container because of the dependency
    opts.components = ["containerId"];
    opts.recursive = true;
    opts.includeDependencies = false;
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = getMockComponentFromFile("projectId1", "buttonId");
    const container = getMockComponentFromFile("projectId1", "containerId");
    expect(button).toBeTruthy();
    expect(container).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("1.2.3");
    expect(container?.name).toEqual("Container");
    expect(container?.version).toEqual("1.2.3");
    expect(checkFile("./src/DepComponent.tsx")).toBeFalsy();

    // Check plasmic.json
    const plasmicJson: PlasmicConfig = JSON.parse(readFile(CONFIG_FILE_NAME));
    expect(plasmicJson.projects.length).toEqual(1);
    const projectConfig = plasmicJson.projects[0];
    expect(projectConfig.components.length).toEqual(2);
  });

  test("dependencies base case", async () => {
    opts.components = ["containerId"];
    opts.recursive = true;
    opts.includeDependencies = true;
    await expect(sync(opts)).resolves.toBeUndefined();
    expect(checkFile("./src/Button.tsx")).toBeTruthy();
    expect(checkFile("./src/Container.tsx")).toBeTruthy();
    const depComponent = getMockComponentFromFile(
      "dependencyId1",
      "depComponentId"
    );
    expect(depComponent).toBeTruthy();
    expect(depComponent?.name).toEqual("DepComponent");
    expect(depComponent?.version).toEqual("2.3.4");

    // Check plasmic.json
    const plasmicJson: PlasmicConfig = JSON.parse(readFile(CONFIG_FILE_NAME));
    expect(plasmicJson.projects.length).toEqual(2);
    const projectConfigMap = L.keyBy(plasmicJson.projects, p => p.projectId);
    expect(projectConfigMap["projectId1"]).toBeTruthy();
    expect(projectConfigMap["dependencyId1"]).toBeTruthy();
    const projectComponentNames = projectConfigMap["projectId1"].components.map(
      c => c.name
    );
    const depComponentNames = projectConfigMap["dependencyId1"].components.map(
      c => c.name
    );
    expect(projectComponentNames).toContain("Button");
    expect(projectComponentNames).toContain("Container");
    expect(depComponentNames).toContain("DepComponent");
  });

  test("conflicting project versions in dependency tree", async () => {
    opts.components = ["containerId"];
    opts.recursive = true;
    opts.includeDependencies = true;
    // Add a conflicting dep
    const containerData = mockApi.getMockComponentById("containerId");
    containerData.children.push({
      id: "depComponentId",
      name: "DepComponent",
      projectId: "dependencyId1",
      version: "3.4.5",
      children: []
    });
    mockApi.setMockComponent("containerId", containerData);
    await expect(sync(opts)).rejects.toThrow();
  });

  test("conflicting project versions in plasmic.json", async () => {
    // First sync the dependency
    opts.components = ["buttonId"];
    opts.recursive = true;
    opts.includeDependencies = true;
    await expect(sync(opts)).resolves.toBeUndefined();

    // Check we have the right version
    const plasmicJson: PlasmicConfig = JSON.parse(readFile(CONFIG_FILE_NAME));
    expect(plasmicJson.projects.length).toEqual(2);
    const depProjectConfig = plasmicJson.projects.find(
      p => p.projectId === "dependencyId1"
    );
    expect(depProjectConfig?.components?.length).toEqual(1);
    expect(depProjectConfig?.version).toEqual("^2.3.4");
    const depComponent = getMockComponentFromFile(
      "dependencyId1",
      "depComponentId"
    );
    expect(depComponent?.version).toEqual("2.3.4");
    expect(depComponent?.id).toEqual("depComponentId");

    // Add a conflicting dep
    const containerData = mockApi.getMockComponentById("containerId");
    const depData = mockApi.getMockComponentById("depComponentId");
    depData.version = "2.0.0"; // using an older version
    containerData.children = [depData];
    mockApi.setMockComponent("containerId", containerData);
    mockApi.setMockComponent("depComponentId", depData);
    opts.components = ["containerId"];
    await expect(sync(opts)).rejects.toThrow();
  });
});
