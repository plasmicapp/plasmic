import L from "lodash";
import { SyncArgs } from "../actions/sync";
import { PlasmicConfig, ProjectConfig } from "../utils/config-utils";
import { TempRepo } from "../utils/test-utils";
import { MockProject } from "../__mocks__/api";

jest.mock("../api");

export const mockApi = require("../api");
export let opts: SyncArgs; // Options to pass to sync
export let tmpRepo: TempRepo;

export const defaultPlasmicJson: PlasmicConfig = {
  platform: "react",
  code: {
    lang: "ts",
    scheme: "blackbox",
    reactRuntime: "classic",
  },
  style: {
    scheme: "css",
    defaultStyleCssFilePath: "plasmic/PP__plasmic__default_style.css",
  },
  images: {
    scheme: "inlined",
  },
  tokens: {
    scheme: "theo",
    tokensFilePath: "plasmic-tokens.theo.json",
  },
  srcDir: "src/",
  defaultPlasmicDir: "./plasmic",
  projects: [],
  globalVariants: {
    variantGroups: [],
  },
  cliVersion: "0.1.44",
};
export function standardTestSetup(includeDep = true) {
  process.env.PLASMIC_DISABLE_AUTH_SEARCH = "1";

  // Setup server-side mock data
  const project1: MockProject = {
    projectId: "projectId1",
    projectApiToken: "abc",
    version: "1.2.3",
    projectName: "project1",
    components: [
      {
        id: "buttonId",
        name: "Button",
      },
      {
        id: "containerId",
        name: "Container",
      },
    ],
    dependencies: includeDep
      ? {
          dependencyId1: "2.3.4",
        }
      : {},
  };
  const dependency: MockProject = {
    projectId: "dependencyId1",
    projectApiToken: "def",
    version: "2.3.4",
    projectName: "dependency1",
    components: [
      {
        id: "depComponentId",
        name: "DepComponent",
      },
    ],
    dependencies: {},
  };
  [project1, dependency].forEach((p) => mockApi.addMockProject(p));

  // Setup client-side directory
  tmpRepo = new TempRepo();
  tmpRepo.writePlasmicAuth({
    host: "http://localhost:3003",
    user: "yang@plasmic.app",
    token: "faketoken",
  });
  tmpRepo.writePlasmicJson(defaultPlasmicJson);

  // Default opts and config
  opts = {
    projects: [],
    yes: true,
    force: true,
    nonRecursive: false,
    skipUpgradeCheck: true,
    forceOverwrite: true,
    newComponentScheme: "blackbox",
    appendJsxOnMissingBase: false,
    config: tmpRepo.plasmicJsonPath(),
    auth: tmpRepo.plasmicAuthPath(),
    loaderConfig: tmpRepo.plasmicLoaderJsonPath(),
    baseDir: process.cwd(),
  };
}

export function standardTestTeardown() {
  tmpRepo.destroy();
  mockApi.clear();
  delete process.env["PLASMIC_DISABLE_AUTH_SEARCH"];
}

export function expectProject1Components() {
  // Check correct files exist
  const button = mockApi.stringToMockComponent(
    tmpRepo.getComponentFileContents("projectId1", "buttonId")
  );
  const container = mockApi.stringToMockComponent(
    tmpRepo.getComponentFileContents("projectId1", "containerId")
  );
  expect(button).toBeTruthy();
  expect(container).toBeTruthy();
  expect(button?.name).toEqual("Button");
  expect(button?.version).toEqual("1.2.3");
  expect(container?.name).toEqual("Container");
  expect(container?.version).toEqual("1.2.3");
}

export const project1Config: ProjectConfig = {
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
        modulePath: "Button.tsx",
      },
      cssFilePath: "plasmic/PlasmicButton.css",
      scheme: "blackbox",
      componentType: "component",
    },
  ],
  icons: [],
  images: [],
  jsBundleThemes: [],
  indirect: false,
};

export function expectProject1PlasmicJson() {
  const plasmicJson = tmpRepo.readPlasmicJson();
  expect(plasmicJson.projects.length).toEqual(1);
  const projectConfig = plasmicJson.projects[0];
  expect(projectConfig.projectApiToken).toBe("abc");
  expect(projectConfig.components.length).toEqual(2);
  const componentNames = projectConfig.components.map((c) => c.name);
  expect(componentNames).toContain("Button");
  expect(componentNames).toContain("Container");
}

export function expectProjectAndDepPlasmicJson() {
  const plasmicJson = tmpRepo.readPlasmicJson();
  expect(plasmicJson.projects.length).toEqual(2);
  const projectConfigMap = L.keyBy(plasmicJson.projects, (p) => p.projectId);
  expect(projectConfigMap["projectId1"]).toBeTruthy();
  expect(projectConfigMap["dependencyId1"]).toBeTruthy();
  const projectComponentNames = projectConfigMap["projectId1"].components.map(
    (c) => c.name
  );
  const depComponentNames = projectConfigMap["dependencyId1"].components.map(
    (c) => c.name
  );
  expect(projectComponentNames).toContain("Button");
  expect(projectComponentNames).toContain("Container");
  expect(depComponentNames).toContain("DepComponent");
}
