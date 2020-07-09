import L from "lodash";
import { ProjectSyncMetadataModel } from "@plasmicapp/code-merger";
import { AuthConfig } from "../utils/config-utils";
import {
  ProjectBundle,
  StyleConfigResponse,
  StyleTokensMap,
  ProjectIconsResponse,
  ProjectMetaBundle
} from "../api";
import { restoreDefaultPrompts } from "inquirer";
import { cpuUsage } from "process";

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
 * Only fetch top-level components that match the projectId (optionally also version)
 * Does not crawl the dependency tree
 * @param projectId
 * @param version
 */
function getComponentsByProjectId(
  projectId: string,
  version?: string
): MockComponent[] {
  return L.chain(COMPONENTS)
    .values()
    .filter(v => v.projectId === projectId)
    .filter(v => !version || v.version === version)
    .value();
}

/**
 * Recursively crawls `children` to get all components in the dependency tree
 * rooted at `component`.
 * By default, stops the moment we hit a component from a different projectId
 * If `includeDependencies` is set, we continue across project boundaries
 * @param component
 * @param includeDependencies
 */
function getComponentsRecursive(
  component: MockComponent,
  includeDependencies?: boolean
): MockComponent[] {
  const result: MockComponent[] = [component];
  const queue = [...component.children];
  while (queue.length > 0) {
    const current = queue.shift();
    if (
      current &&
      (component.projectId === current.projectId || !!includeDependencies)
    ) {
      result.push(current);
      queue.push(...current.children);
    }
  }
  return result;
}

function genFilename(base: string, suffix: string) {
  return "Plasmic" + base + "." + suffix;
}

function genComponentBundle(component: MockComponent) {
  return {
    renderModule: mockComponentToString(component),
    skeletonModule: mockComponentToString(component),
    cssRules: "css rules " + component.name,
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
    cssRules: "css rules " + projectId
  };
}

class PlasmicApi {
  constructor(private auth: AuthConfig) {}

  async genStyleConfig(): Promise<StyleConfigResponse> {
    const result = {
      defaultStyleCssFileName: genFilename("default", "css"),
      defaultStyleCssRules: "default css"
    };
    return result;
  }

  async projectComponents(
    projectId: string,
    cliVersion: string,
    reactWebVersion: string | undefined,
    newCompScheme: "blackbox" | "direct",
    // The list of existing components as [componentUuid, codeScheme]
    existingCompScheme: Array<[string, "blackbox" | "direct"]>,
    componentIdOrNames: readonly string[] | undefined,
    recursive?: boolean
  ): Promise<ProjectBundle> {
    if (L.keys(COMPONENTS).length <= 0) {
      throw new Error("Remember to call __setMockComponents first!");
    }
    const projectComponents = getComponentsByProjectId(projectId);
    const rootComponents = componentIdOrNames
      ? projectComponents.filter(
          c =>
            componentIdOrNames.includes(c.id) ||
            componentIdOrNames.includes(c.name)
        )
      : projectComponents;
    const components = !!recursive
      ? L.flatMap(rootComponents, c => getComponentsRecursive(c, false))
      : [...rootComponents];

    const result = {
      components: components.map(c => genComponentBundle(c)),
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
