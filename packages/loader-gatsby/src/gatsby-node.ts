import { ComponentMeta, LoaderBundleOutput } from "@plasmicapp/loader-core";
import {
  convertBundlesToComponentRenderData,
  initPlasmicLoader,
} from "@plasmicapp/loader-react";
import { InitOptions } from "@plasmicapp/loader-react/dist/loader";
import type { PlasmicRemoteChangeWatcher as Watcher } from "@plasmicapp/watcher";
import serverRequire from "./server-require";

export const onPreInit = ({ reporter }) =>
  reporter.success("Loaded @plasmicapp/loader-gatsby");

type GatsbyPluginOptions = InitOptions & {
  defaultPlasmicPage?: string;
  ignorePaths?: string[];
};

const PLASMIC_NODE_NAME = "plasmicData";

const PLASMIC_DATA_TYPE = `
  type ${PLASMIC_NODE_NAME} implements Node {
    name: String!
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
  { actions, /* createNodeId, */ createContentDigest, reporter }: any,
  opts: GatsbyPluginOptions
) => {
  const { createNode, createTypes, deleteNode } = actions;

  createTypes(PLASMIC_DATA_TYPE);

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

    // const getNodeId = (projectId, componentName) =>
    // createNodeId(`@plasmicapp/loader-gatsby/${projectId}-${componentName}`);

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

export const createResolvers = (
  { createResolvers },
  opts: GatsbyPluginOptions
) => {
  createResolvers({
    Query: {
      plasmicComponents: {
        resolve(source, args, context, info) {
          const { componentNames } = args;
          const components = context.nodeModel.getAllNodes({
            type: PLASMIC_NODE_NAME,
          });

          const bundles: LoaderBundleOutput[] = [];
          const compMetas: ComponentMeta[] = [];
          for (const component of components) {
            if (
              componentNames.includes(component.name) ||
              componentNames.includes(component.path) ||
              componentNames.includes(component.path + "/")
            ) {
              const bundle = component.renderData?.bundle;
              if (bundle) {
                bundles.push(bundle);
                compMetas.push(component);
              }
            }
          }

          return convertBundlesToComponentRenderData(bundles, compMetas);
        },
      },
      plasmicOptions: {
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

export const createPages = async (
  { graphql, actions, reporter }: any,
  opts: GatsbyPluginOptions
) => {
  const { defaultPlasmicPage } = opts;

  const ignorePaths = opts.ignorePaths || [];

  if (defaultPlasmicPage) {
    reporter.info(`[Plasmic Loader] - Creating pages`);

    const { createPage, deletePage } = actions;
    const result = await graphql(`
      query {
        allPlasmicData(filter: { isPage: { eq: true } }) {
          nodes {
            path
          }
        }
      }
    `);

    const pages = result.data.allPlasmicData.nodes;

    for (const path of allPaths) {
      await deletePage({
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

      await createPage({
        path: page.path,
        component: defaultPlasmicPage,
      });
      reporter.verbose(`[Plasmic Loader] - Created page ${page.path}`);
    }
  }
};
