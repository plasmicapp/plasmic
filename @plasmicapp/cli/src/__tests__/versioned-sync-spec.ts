jest.mock("../api");
const mockApi = require("../api");
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
import { syncProjects, SyncArgs } from "../actions/sync";
import { AUTH_FILE_NAME, CONFIG_FILE_NAME } from "../utils/config-utils";
import { MockComponent } from "../__mocks__/api";
import { PlasmicConfig } from "../utils/config-utils";

let opts: SyncArgs; // Options to pass to syncProjects
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
  const button = {
    id: "buttonId",
    name: "Button",
    projectId: "projectId1",
    version: "1.2.3",
    children: []
  };
  const container = {
    id: "containerId",
    name: "Container",
    projectId: "projectId1",
    version: "1.2.3",
    children: [button]
  };
  const components: MockComponent[] = [button, container];
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
    cliVersion: "0.1.40"
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
    await syncProjects(opts);
    const button = mockApi.stringToMockComponent(readFile("./src/Button.tsx"));
    const container = mockApi.stringToMockComponent(
      readFile("./src/Container.tsx")
    );
    expect(button).toBeTruthy();
    expect(container).toBeTruthy();
    expect(button.name).toEqual("Button");
    expect(button.version).toEqual("1.2.3");
    expect(container.name).toEqual("Container");
    expect(container.version).toEqual("1.2.3");
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
    await expect(syncProjects(opts)).rejects.toThrow();
  });

  test("syncs down new names", async () => {
    opts.components = ["buttonId", "containerId"];
    await syncProjects(opts); // Sync'ed project directory
    // Change component name server-side
    const buttonData = mockApi.getMockComponentById("buttonId");
    buttonData.name = "NewButton";
    mockApi.setMockComponent("buttonId", buttonData);
    // Try syncing again and see if things show up
    await syncProjects(opts);

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

  /**
  test("syncs latest", async () => {});

  test("syncs exact version", async () => {});

  test("syncs according to semver", async () => {});
  */
});

describe("recursive-sync", () => {
  test("recursive base case", async () => {
    // Should sync both Button+Container because of the dependency
    opts.components = ["containerId"];
    opts.recursive = true;
    await syncProjects(opts);
    const button = mockApi.stringToMockComponent(readFile("./src/Button.tsx"));
    const container = mockApi.stringToMockComponent(
      readFile("./src/Container.tsx")
    );
    expect(button).toBeTruthy();
    expect(container).toBeTruthy();
    expect(button.name).toEqual("Button");
    expect(button.version).toEqual("1.2.3");
    expect(container.name).toEqual("Container");
    expect(container.version).toEqual("1.2.3");
  });
});

/**
describe("sync-dependencies", () => {
  test("dependencies base case", () => {});
  test("conflicting project versions", () => {});
});
*/
