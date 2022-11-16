import { ComponentMeta, LoaderBundleOutput } from "@plasmicapp/loader-core";
import {
  convertBundlesToComponentRenderData,
  InitOptions,
  initPlasmicLoader,
  matchesPagePath,
} from "@plasmicapp/loader-react";
import type { PlasmicRemoteChangeWatcher as Watcher } from "@plasmicapp/watcher";
import { CreatePagesArgs, GatsbyNode } from "gatsby";
import serverRequire from "./server-require";

export const onPreInit = ({ reporter }) =>
  reporter.success("Loaded @plasmicapp/loader-gatsby");

export type GatsbyPluginOptions = InitOptions & {
  defaultPlasmicPage?: string;
  ignorePaths?: string[];
};

const PLASMIC_NODE_NAME = "plasmicData";

const PLASMIC_DATA_TYPE = `
  type ${PLASMIC_NODE_NAME} implements Node {
    name: String!
    displayName: String!
    projectId: String!
    path: String
    isPage: Boolean!
    renderData: JSON!
  }

  type Query {
    plasmicComponents(componentNames: [String]!): JSON
    plasmicOptions: JSON
  }
`;

const SOURCE_WAIT_TIME = 3000; // 3 seconds
const SOURCE_MAX_WAIT_TIME = 10000; // 10 seconds

let allPaths: string[] = [];

export const sourceNodes = async (
  { actions, createContentDigest, reporter }: any,
  opts: GatsbyPluginOptions
) => {
  const { createNode, deleteNode } = actions;

  let allComponents: any[] = [];

  const refreshData = async () => {
    reporter.info(`[Plasmic Loader] - Creating nodes`);

    const PLASMIC = initPlasmicLoader({
      projects: opts.projects,
      preview: opts.preview,
      host: opts.host,
      platform: "gatsby",
    });

    const components = await PLASMIC.fetchComponents();

    for (const component of allComponents) {
      const hasComponent = components.some((c) => c.name === component.name);
      /**
       * We shouldn't delete nodes that will be updated, if we delete all nodes
       * and then create it again, this could case the graphql layer to have no
       * plasmic data for some time, but this can be enough time to a re render
       * causing components that call a graphql query to plasmic data to crash
       * */
      if (!hasComponent) {
        deleteNode(component);
        reporter.verbose(`[Plasmic Loader] - Deleted node ${component.name}`);
      }
    }

    allComponents = [];
    for (const component of components) {
      const renderData = await PLASMIC.fetchComponentData({
        name: component.name,
        projectId: component.projectId,
      });

      const curComponent = {
        ...component,
        renderData,
      };

      const componentMeta = {
        // We use the same id as curComponent.id since loader-react might
        // expect the id to match plasmic component uuid.
        // id: getNodeId(component.projectId, component.name),
        parent: null,
        children: [],
        internal: {
          type: PLASMIC_NODE_NAME,
          contentDigest: createContentDigest(curComponent),
        },
      };

      const componentNode = Object.assign({}, curComponent, componentMeta);

      createNode(componentNode);
      reporter.verbose(
        `[Plasmic Loader] - Created component node ${component.name}`
      );
      allComponents.push(componentNode);
    }
  };

  if (process.env.NODE_ENV !== "production") {
    const debounce = serverRequire("lodash/debounce");
    const triggerSourcing = debounce(refreshData, SOURCE_WAIT_TIME, {
      maxWait: SOURCE_MAX_WAIT_TIME,
    });

    const PlasmicRemoteChangeWatcher = serverRequire("@plasmicapp/watcher")
      .PlasmicRemoteChangeWatcher as typeof Watcher;

    const watcher = new PlasmicRemoteChangeWatcher({
      projects: opts.projects,
      host: opts.host,
    });

    watcher.subscribe({
      onUpdate: () => {
        if (opts.preview) {
          triggerSourcing();
        }
      },
      onPublish: () => {
        if (!opts.preview) {
          triggerSourcing();
        }
      },
    });
  }

  await refreshData();
};

async function getAllNodes(nodeModel, type) {
  try {
    const { entries } = await nodeModel.findAll({ type });
    return entries;
  } catch (_) {
    // Gatsby < v4 does not have `nodeModel.findAll`, so we try to use the
    // deprecated `nodeModel.getAllNodes` instead.
    return nodeModel.getAllNodes({ type });
  }
}

export const createResolvers: GatsbyNode["createResolvers"] = (
  { createResolvers },
  opts
) => {
  createResolvers({
    Query: {
      plasmicComponents: {
        type: "JSON",
        args: {
          componentNames: `[String]!`,
        },
        async resolve(
          _source,
          args: { componentNames: string[] },
          context,
          _info
        ) {
          const { componentNames } = args;

          const components = await getAllNodes(
            context.nodeModel,
            PLASMIC_NODE_NAME
          );

          const bundles: LoaderBundleOutput[] = [];
          const compMetas: ComponentMeta[] = [];
          for (const component of components) {
            if (
              componentNames.includes(component.name) ||
              componentNames.includes(component.displayName) ||
              !!(
                component.path &&
                componentNames.some((lookup) =>
                  matchesPagePath(component.path, lookup)
                )
              )
            ) {
              const bundle = component.renderData?.bundle;
              if (bundle) {
                bundles.push(bundle);

                let meta = component;

                // If component is a page, try to parse dynamic params.
                if (component.path) {
                  for (const lookup of componentNames) {
                    const match = matchesPagePath(component.path, lookup);
                    if (match) {
                      meta = { ...meta, params: match.params };
                      break;
                    }
                  }
                }

                compMetas.push(meta);
              }
            }
          }

          return convertBundlesToComponentRenderData(bundles, compMetas);
        },
      },
      plasmicOptions: {
        type: "JSON",
        resolve() {
          return {
            projects: opts.projects,
            preview: opts.preview,
            host: opts.host,
          };
        },
      },
    },
  });
};

export const createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  createTypes(PLASMIC_DATA_TYPE);
};

interface LoaderGatsbyPluginOptions extends GatsbyPluginOptions {
  defaultPlasmicPage: string;
}

export const createPages = async (
  { graphql, actions, reporter }: CreatePagesArgs,
  opts: LoaderGatsbyPluginOptions
) => {
  const { defaultPlasmicPage } = opts;

  const ignorePaths = opts.ignorePaths || [];

  if (defaultPlasmicPage) {
    reporter.info(`[Plasmic Loader] - Creating pages`);

    const { createPage, deletePage } = actions;
    const result = await graphql<{
      allPlasmicData: { nodes: Array<{ path: string }> };
    }>(`
      query {
        allPlasmicData(filter: { isPage: { eq: true } }) {
          nodes {
            path
          }
        }
      }
    `);

    const pages = result.data?.allPlasmicData.nodes;
    if (!pages) {
      reporter.error(`[Plasmic Loader] - GraphQL did not return pages`);
      return;
    }

    for (const path of allPaths) {
      deletePage({
        path,
        component: defaultPlasmicPage,
      });
      reporter.verbose(`[Plasmic Loader] - Deleted page ${path}`);
    }

    allPaths = [];

    for (const page of pages) {
      const path = page.path;
      if (ignorePaths.includes(path) || ignorePaths.includes(path + "/")) {
        continue;
      }
      allPaths.push(page.path);

      createPage({
        path: page.path,
        component: defaultPlasmicPage,
        context: {},
      });
      reporter.verbose(`[Plasmic Loader] - Created page ${page.path}`);
    }
  }
};
