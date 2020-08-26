import L from "lodash";
import { ensure } from "../utils/lang-utils";
import * as semver from "../utils/semver";
import { ProjectSyncMetadataModel } from "@plasmicapp/code-merger";
import { AuthConfig } from "../utils/config-utils";
import {
  ProjectBundle,
  StyleConfigResponse,
  StyleTokensMap,
  ProjectVersionMeta,
  ProjectIconsResponse,
  ProjectMetaBundle,
  ComponentBundle,
  VersionResolution,
} from "../api";

const api: any = jest.genMockFromModule("../api");

/**
 * Store a simplified data model for use with testing
 */
// Keyed by (projectId, version)
const PROJECTS: MockProject[] = [];
export interface MockProject {
  projectId: string;
  version: string;
  components: MockComponent[];
  dependencies: {
    [projectId: string]: string;
  };
}
export interface MockComponent {
  id: string;
  name: string;
  projectId?: string;
  version?: string;
}

function clear() {
  while (PROJECTS.length > 0) {
    PROJECTS.shift();
  }
}

function mockProjectToProjectVersionMeta(
  mock: MockProject,
  componentIdOrNames?: readonly string[]
): ProjectVersionMeta {
  return {
    ...mock,
    componentIds: mock.components
      .filter(
        (c) =>
          !componentIdOrNames ||
          componentIdOrNames.includes(c.name) ||
          componentIdOrNames.includes(c.id)
      )
      .map((c) => c.id),
    iconIds: [],
  };
}

/**
 * Call this in test to setup the data model
 * @param id componentId
 * @param comp MockComponent
 */
function addMockProject(proj: MockProject) {
  const projectId = proj.projectId;
  const version = proj.version;
  // Populate projectId and version into each component
  // will be useful when reading / writing components to files
  proj.components = proj.components.map((c) => {
    return {
      ...c,
      projectId,
      version,
    };
  });

  const existing = getMockProject(projectId, version);
  if (!existing) {
    PROJECTS.push(proj);
  } else {
    existing.components = proj.components;
    existing.dependencies = proj.dependencies;
  }
}

/**
 * Used to interpret data that's stored in the "codegen" files from the Mock server
 * @param data
 */
function stringToMockComponent(data?: string): MockComponent | undefined {
  if (!data) {
    return;
  }
  const withoutComments = data.startsWith("//") ? data.slice(2) : data;
  const cleaned = withoutComments.trim();
  return JSON.parse(cleaned);
}

/**
 * Used to write mock data into files for testing.
 * Useful to see what version was written
 * Need to prefix with a comment to satisfy the parser used in `fixAllImports`
 * @param component
 */
function mockComponentToString(component: MockComponent): string {
  return "// " + JSON.stringify(component);
}

function getMockProject(
  projectId: string,
  version: string
): MockProject | undefined {
  return PROJECTS.find(
    (m) => m.projectId === projectId && m.version === version
  );
}

/**
 * Only fetch top-level components that match the projectId (optionally also componentIdOrNames + version)
 * Does not crawl the dependency tree
 * @param projectId
 * @param componentIdOrNames
 * @param versionRange
 */
function getMockComponents(
  projectId: string,
  version: string,
  componentIdOrNames: readonly string[] | undefined
): MockComponent[] {
  const project = getMockProject(projectId, version);
  return !project
    ? []
    : project.components.filter(
        (c) =>
          !componentIdOrNames ||
          componentIdOrNames.includes(c.id) ||
          componentIdOrNames.includes(c.name)
      );
}

function genFilename(base: string, suffix: string) {
  return "Plasmic" + base + "." + suffix;
}

function genComponentBundle(component: MockComponent): ComponentBundle {
  return {
    renderModule: mockComponentToString(component),
    skeletonModule: mockComponentToString(component),
    cssRules: `theClass {color: blue;}`,
    renderModuleFileName: genFilename(component.name, "tsx"),
    skeletonModuleFileName: component.name + ".tsx",
    cssFileName: genFilename(component.name, "css"),
    componentName: component.name,
    id: component.id,
    scheme: "blackbox",
    nameInIdToUuid: [],
  };
}

function genEmptyStyleTokensMap() {
  return {
    props: [],
    global: {
      meta: {
        source: "plasmic.app" as "plasmic.app",
      },
    },
  };
}

function genProjectMetaBundle(projectId: string): ProjectMetaBundle {
  return {
    projectId,
    projectName: projectId,
    cssFileName: genFilename(projectId, "css"),
    cssRules: `theClass {color: green;}`,
  };
}

class PlasmicApi {
  constructor(private auth: AuthConfig) {}

  async genStyleConfig(): Promise<StyleConfigResponse> {
    const result = {
      defaultStyleCssFileName: genFilename("default", "css"),
      defaultStyleCssRules: `theClass {color: red;}`,
    };
    return result;
  }

  async resolveSync(
    projects: {
      projectId: string;
      versionRange: string;
      componentIdOrNames: readonly string[] | undefined;
    }[],
    recursive?: boolean
  ): Promise<VersionResolution> {
    const results: VersionResolution = {
      projects: [],
      dependencies: [],
      conflicts: [],
    };

    // Get top level projects
    projects.forEach((proj) => {
      const availableProjects = Array.from(PROJECTS.values()).filter(
        (p) => p.projectId === proj.projectId
      );
      const availableVersions = availableProjects.map((p) => p.version);
      const version = semver.maxSatisfying(
        availableVersions,
        proj.versionRange
      );
      if (version) {
        const mockProject = ensure(getMockProject(proj.projectId, version));
        const projectMeta = mockProjectToProjectVersionMeta(
          mockProject,
          proj.componentIdOrNames
        );
        results.projects.push(projectMeta);
      }
    });

    // Get dependencies
    if (!!recursive) {
      const queue: ProjectVersionMeta[] = [...results.projects];
      while (queue.length > 0) {
        const curr = ensure(queue.shift());
        L.toPairs(curr.dependencies).forEach(([projectId, version]) => {
          const mockProject = ensure(getMockProject(projectId, version));
          const projectMeta = mockProjectToProjectVersionMeta(mockProject);
          results.dependencies.push(projectMeta);
          queue.push(projectMeta);
        });
      }
    }

    return results;
  }

  async projectComponents(
    projectId: string,
    cliVersion: string,
    reactWebVersion: string | undefined,
    newCompScheme: "blackbox" | "direct",
    // The list of existing components as [componentUuid, codeScheme]
    existingCompScheme: Array<[string, "blackbox" | "direct"]>,
    componentIdOrNames: readonly string[] | undefined,
    version: string
  ): Promise<ProjectBundle> {
    if (PROJECTS.length <= 0) {
      throw new Error("Remember to call __addMockProject first!");
    }
    const mockComponents = getMockComponents(
      projectId,
      version,
      componentIdOrNames
    );
    if (mockComponents.length <= 0) {
      throw new Error("Code gen failed: no components match the parameters");
    }

    const result = {
      components: mockComponents.map((c) => genComponentBundle(c)),
      projectConfig: genProjectMetaBundle(projectId),
      globalVariants: [],
      usedTokens: genEmptyStyleTokensMap(),
      iconAssets: [],
    };
    return result;
  }

  async uploadBundle(
    projectId: string,
    bundleName: string,
    bundleJs: string,
    css: string[],
    metaJson: string
  ): Promise<StyleTokensMap> {
    throw new Error("Unimplemented");
  }

  async projectStyleTokens(projectId: string): Promise<StyleTokensMap> {
    throw new Error("Unimplemented");
  }

  async projectIcons(projectId: string): Promise<ProjectIconsResponse> {
    throw new Error("Unimplemented");
  }

  async projectSyncMetadata(
    projectId: string,
    revision: number,
    rethrowAppError: boolean
  ): Promise<ProjectSyncMetadataModel> {
    throw new Error("Unimplemented");
  }

  connectSocket() {}
}

api.PlasmicApi = PlasmicApi;
api.clear = clear;
api.getMockProject = getMockProject;
api.addMockProject = addMockProject;
api.stringToMockComponent = stringToMockComponent;
module.exports = api;
