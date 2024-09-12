/// <reference types="@types/jest" />
import { MockProject } from "../__mocks__/api";
import { SyncArgs } from "../actions/sync";
import { PlasmicConfig, ProjectConfig } from "../utils/config-utils";
import { TempRepo } from "../utils/test-utils";

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
  wrapPagesWithGlobalContexts: true,
  cliVersion: "0.1.44",
};
export function standardTestSetup(includeDep = false) {
  process.env.PLASMIC_DISABLE_AUTH_SEARCH = "1";

  // Setup server-side mock data
  const project1: MockProject = {
    projectId: "projectId1",
    branchName: "main",
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
    branchName: "main",
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
    config: tmpRepo.plasmicJsonPath(),
    auth: tmpRepo.plasmicAuthPath(),
    baseDir: process.cwd(),
  };
}

export function standardTestTeardown() {
  tmpRepo.destroy();
  mockApi.clear();
  delete process.env["PLASMIC_DISABLE_AUTH_SEARCH"];
}

export function expectComponent({
  expectInPlasmicJson = true,
  projectId,
  projectVersion,
  id,
  name,
  cssPath,
  renderPath,
  skeletonPath,
  skeletonVersion,
  depComponents = [],
}: {
  expectInPlasmicJson?: boolean;
  projectId: string;
  projectVersion: string;
  id: string;
  name: string;
  cssPath: string;
  renderPath: string;
  skeletonPath: string;
  skeletonVersion: string;
  depComponents?: {
    id: string;
    name: string;
  }[];
}) {
  // Check component exists in plasmic.json
  const plasmicJson = tmpRepo.readPlasmicJson();
  expect(plasmicJson.projects).toContainEqual(
    expect.objectContaining({
      projectId,
    })
  );
  const project = plasmicJson.projects.find((p) => p.projectId === projectId)!;
  if (expectInPlasmicJson) {
    expect(project.components).toContainEqual(
      expect.objectContaining({
        projectId,
        id,
        name,
        importSpec: {
          modulePath: skeletonPath,
        },
        renderModuleFilePath: renderPath,
        cssFilePath: cssPath,
        componentType: "component",
        scheme: "blackbox",
        type: "managed",
      })
    );
  } else {
    expect(project.components).not.toContainEqual(
      expect.objectContaining({
        projectId,
        id,
        name,
      })
    );
  }

  // Check correct files exist
  const modules = tmpRepo.readGeneratedComponentFiles(projectId, id);
  expect(modules.cssPath).toEqual(`src/${cssPath}`);
  expect(modules.renderPath).toEqual(`src/${renderPath}`);
  expect(modules.skeletonPath).toEqual(`src/${skeletonPath}`);

  // Check component data (esp version) that files were generated from
  // Render and CSS always gets rewritten, so use projectVersion
  // Skeleton only gets written once, so it gets its own skeletonVersion
  const cssData = mockApi.stringToMockComponent(modules.css);
  expect(cssData.name).toEqual(name);
  expect(cssData.version).toEqual(projectVersion);
  const renderData = mockApi.stringToMockComponent(modules.render);
  expect(renderData.name).toEqual(name);
  expect(renderData.version).toEqual(projectVersion);
  const skeletonData = mockApi.stringToMockComponent(modules.skeleton);
  expect(skeletonData.name).toEqual(name);
  expect(skeletonData.version).toEqual(skeletonVersion);

  // Check imports in render file
  for (const depComp of depComponents) {
    expect(modules.render).toContain(
      `import ${depComp.name} from "../../${depComp.name}"; // plasmic-import: ${depComp.id}/component`
    );
  }

  // Check Plasmic import directives are removed from skeleton file
  expect(modules.skeleton).not.toContain("// plasmic-import:");
}

export function expectProject1Components(opts?: { includeDep: boolean }) {
  const depComponents = opts?.includeDep
    ? [
        {
          id: "depComponentId",
          name: "DepComponent",
        },
      ]
    : undefined;
  expectComponent({
    projectId: "projectId1",
    projectVersion: "1.2.3",
    id: "buttonId",
    name: "Button",
    skeletonVersion: "1.2.3",
    skeletonPath: "Button.tsx",
    renderPath: "plasmic/project_id_1/PlasmicButton.tsx",
    cssPath: "plasmic/project_id_1/PlasmicButton.css",
    depComponents,
  });
  expectComponent({
    projectId: "projectId1",
    projectVersion: "1.2.3",
    id: "containerId",
    name: "Container",
    skeletonVersion: "1.2.3",
    skeletonPath: "Container.tsx",
    renderPath: "plasmic/project_id_1/PlasmicContainer.tsx",
    cssPath: "plasmic/project_id_1/PlasmicContainer.css",
    depComponents,
  });
}

export function expectDepComponents() {
  expectComponent({
    projectId: "dependencyId1",
    projectVersion: "2.3.4",
    id: "depComponentId",
    name: "DepComponent",
    skeletonVersion: "2.3.4",
    skeletonPath: "DepComponent.tsx",
    renderPath: "plasmic/dependency_id_1/PlasmicDepComponent.tsx",
    cssPath: "plasmic/dependency_id_1/PlasmicDepComponent.css",
  });
}

export const project1Config: ProjectConfig = {
  projectId: "projectId1",
  projectName: "Project 1",
  projectBranchName: "main",
  projectApiToken: "abc",
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
  globalContextsFilePath: "",
  splitsProviderFilePath: "",
};
