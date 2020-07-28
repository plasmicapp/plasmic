import L from "lodash";
import * as semver from "../utils/semver";
import { VersionResolution, mergeResolves } from "../utils/versions";
import { ProjectSyncMetadataModel } from "@plasmicapp/code-merger";
import { AuthConfig } from "../utils/config-utils";
import {
  ProjectBundle,
  StyleConfigResponse,
  StyleTokensMap,
  ProjectIconsResponse,
  ProjectMetaBundle,
  ComponentBundle
} from "../api";

const api: any = jest.genMockFromModule("../api");

/**
 * Store a simplified data model for use with testing
 * NOTE: each component can have its own dependency tree, which may not be consistent.
 * This allows you to write really flexible tests,
 * but may not enforce all constraints that a server would typically provide.
 */
let COMPONENTS: L.Dictionary<MockComponent> = {};
export interface MockComponent {
  id: string;
  name: string;
  projectId: string;
  version: string;
  children: MockComponent[];
}

/**
 * Call this in test to setup the data model
 * @param id componentId
 * @param comp MockComponent
 */
function setMockComponent(id: string, comp: MockComponent) {
  COMPONENTS[id] = comp;
}

/**
 * Used to interpret data that's stored in the "codegen" files from the Mock server
 * @param data
 */
function stringToMockComponent(data: string): MockComponent {
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

/**
 * Only fetch by top-level id.
 * Does not crawl the dependency tree.
 * @param id
 */
function getMockComponentById(id: string): MockComponent {
  return COMPONENTS[id];
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
  componentIdOrNames: readonly string[] | undefined,
  versionRange: string
): MockComponent[] {
  return L.chain(COMPONENTS)
    .values()
    .filter(c => c.projectId === projectId)
    .filter(
      c =>
        !componentIdOrNames ||
        componentIdOrNames.includes(c.id) ||
        componentIdOrNames.includes(c.name)
    )
    .filter(c => semver.satisfies(c.version, versionRange))
    .value();
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
    nameInIdToUuid: []
  };
}

function genEmptyStyleTokensMap() {
  return {
    props: [],
    global: {
      meta: {
        source: "plasmic.app" as "plasmic.app"
      }
    }
  };
}

function genProjectMetaBundle(projectId: string): ProjectMetaBundle {
  return {
    projectId,
    projectName: projectId,
    cssFileName: genFilename(projectId, "css"),
    cssRules: `theClass {color: green;}`
  };
}

class PlasmicApi {
  constructor(private auth: AuthConfig) {}

  async genStyleConfig(): Promise<StyleConfigResponse> {
    const result = {
      defaultStyleCssFileName: genFilename("default", "css"),
      defaultStyleCssRules: `theClass {color: red;}`
    };
    return result;
  }

  async resolveSync(
    projects: {
      projectId: string;
      versionRange: string;
      componentIdOrNames: readonly string[] | undefined;
    }[],
    recursive?: boolean,
    includeDependencies?: boolean
  ): Promise<VersionResolution> {
    // Keyed by projectId, since we can only have 1 version per projectId
    let results: VersionResolution = { projects: [], conflicts: [] };
    const queue = L.flatMap(projects, p =>
      getMockComponents(p.projectId, p.componentIdOrNames, p.versionRange)
    );
    while (queue.length > 0) {
      const c = queue.shift();
      if (!c) {
        continue;
      }
      results = mergeResolves([
        results,
        {
          projects: [
            {
              projectId: c.projectId,
              version: c.version,
              componentIds: [c.id]
            }
          ],
          conflicts: []
        }
      ]);

      // Recursive Mode
      if (recursive) {
        if (includeDependencies) {
          queue.push(...c.children);
        } else {
          const childrenFromSameProject = c.children.filter(
            child => child.projectId === c.projectId
          );
          queue.push(...childrenFromSameProject);
        }
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
    if (L.keys(COMPONENTS).length <= 0) {
      throw new Error("Remember to call __setMockComponents first!");
    }
    const mockComponents = getMockComponents(
      projectId,
      componentIdOrNames,
      version
    );
    if (mockComponents.length <= 0) {
      throw new Error("Code gen failed: no components match the parameters");
    }

    const result = {
      components: mockComponents.map(c => genComponentBundle(c)),
      projectConfig: genProjectMetaBundle(projectId),
      globalVariants: [],
      usedTokens: genEmptyStyleTokensMap(),
      iconAssets: []
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
api.getMockComponentById = getMockComponentById;
api.setMockComponent = setMockComponent;
api.stringToMockComponent = stringToMockComponent;
module.exports = api;
