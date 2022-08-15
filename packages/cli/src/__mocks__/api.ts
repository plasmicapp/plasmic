import { ProjectSyncMetadataModel } from "@plasmicapp/code-merger";
import L from "lodash";
import {
  ChecksumBundle,
  ComponentBundle,
  ProjectBundle,
  ProjectIconsResponse,
  ProjectIdAndToken,
  ProjectMetaBundle,
  ProjectVersionMeta,
  RequiredPackages,
  StyleConfigResponse,
  StyleTokensMap,
  VersionResolution,
} from "../api";
import { AuthConfig } from "../utils/config-utils";
import { ensure } from "../utils/lang-utils";
import * as semver from "../utils/semver";

const api: any = jest.genMockFromModule("../api");

/**
 * Store a simplified data model for use with testing
 */
// Keyed by (projectId, version)
const PROJECTS: MockProject[] = [];
export interface MockProject {
  projectId: string;
  projectApiToken: string;
  version: string;
  projectName: string;
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
    indirect: false,
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
    isPage: false,
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
    jsBundleThemes: [],
  };
}

function* getDeps(projects: ProjectVersionMeta[]) {
  const queue: ProjectVersionMeta[] = [...projects];
  while (queue.length > 0) {
    const curr = ensure(queue.shift());
    for (const [projectId, version] of L.toPairs(curr.dependencies)) {
      const mockProject = ensure(getMockProject(projectId, version));
      const projectMeta = mockProjectToProjectVersionMeta(mockProject);
      yield projectMeta;
      queue.push(projectMeta);
    }
  }
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
      projectApiToken?: string;
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
      if (
        !(
          (this.auth.user && this.auth.token) ||
          availableProjects.every(
            (p) => p.projectApiToken === proj.projectApiToken
          )
        )
      ) {
        throw new Error("No user+token, and project API tokens don't match");
      }
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
      const deps = [...getDeps(results.projects)];
      results.dependencies.push(...deps);
    }

    return results;
  }

  async getCurrentUser() {
    return true;
  }

  async projectComponents(
    projectId: string,
    opts: {
      platform: string;
      newCompScheme: "blackbox" | "direct";
      // The list of existing components as [componentUuid, codeScheme]
      existingCompScheme: Array<[string, "blackbox" | "direct"]>;
      componentIdOrNames: readonly string[] | undefined;
      version: string;
    }
  ): Promise<ProjectBundle> {
    const { componentIdOrNames, version } = opts;
    if (PROJECTS.length <= 0) {
      throw new Error("Remember to call __addMockProject first!");
    }
    const maybeTokenPair = this.lastProjectIdsAndTokens.find(
      (pair) => pair.projectId === projectId
    );
    const project = ensure(PROJECTS.find((p) => p.projectId === projectId));
    if (
      !(
        (this.auth.user && this.auth.token) ||
        project.projectApiToken === maybeTokenPair?.projectApiToken
      )
    ) {
      throw new Error("No user+token and project API tokens don't match");
    }
    // Server also require tokens for the dependencies.
    const deps = [...getDeps([mockProjectToProjectVersionMeta(project)])];
    if (
      !deps.every((dep) =>
        this.lastProjectIdsAndTokens.find((p) => p.projectId === dep.projectId)
      )
    ) {
      throw new Error(
        "No user+token and project API tokens don't match on a dependency"
      );
    }
    const mockComponents = getMockComponents(
      projectId,
      version,
      componentIdOrNames
    );
    if (mockComponents.length <= 0) {
      throw new Error(
        `Code gen failed: no components match the parameters ${JSON.stringify(
          { projectId, version, componentIdOrNames },
          undefined,
          2
        )}`
      );
    }

    const components = mockComponents.map((c) => genComponentBundle(c));
    const result = {
      components,
      codeComponentMetas: [],
      projectConfig: genProjectMetaBundle(projectId),
      globalVariants: [],
      usedTokens: genEmptyStyleTokensMap(),
      iconAssets: [],
      imageAssets: [],
      checksums: {
        renderModuleChecksums: components.map((c) => [c.id, c.renderModule]),
        cssRulesChecksums: components.map((c) => [c.id, c.cssRules]),
        imageChecksums: [],
        iconChecksums: [],
        globalVariantChecksums: [],
        projectCssChecksum: "",
        globalContextsChecksum: "",
      } as ChecksumBundle,
      usedNpmPackages: [],
      externalCssImports: [],
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

  async latestCodegenVersion(): Promise<string> {
    return "0.0.1";
  }

  async requiredPackages(): Promise<RequiredPackages> {
    return {
      "@plasmicapp/loader": "0.0.1",
      "@plasmicapp/cli": "0.0.1",
      "@plasmicapp/host": "0.0.1",
      "@plasmicapp/react-web": "0.0.1",
      "@plasmicapp/react-web-runtime": "0.0.1",
    };
  }

  connectSocket() {}

  lastProjectIdsAndTokens: ProjectIdAndToken[] = [];
  attachProjectIdsAndTokens(idsAndTokens: ProjectIdAndToken[]) {
    this.lastProjectIdsAndTokens = idsAndTokens;
  }
}

api.PlasmicApi = PlasmicApi;
api.clear = clear;
api.getMockProject = getMockProject;
api.addMockProject = addMockProject;
api.stringToMockComponent = stringToMockComponent;
module.exports = api;
