import path from "upath";
import * as logger from "../shared/logger";
import { initLoader, convertOptsToLoaderConfig, onPostInit } from "../shared";
import type {
  PlasmicLoaderConfig,
  PlasmicOpts,
  PluginOptions,
  Substitutions,
} from "../shared/types";

let config: PlasmicLoaderConfig;
let watch = process.env.NODE_ENV === "development";
async function onGatsbyPreBootstrap(pluginOptions: PluginOptions) {
  // This is passed by Gatsby, here we're deleting it to make sure
  // the plugin options only contains known keys.
  delete (pluginOptions as any).plugins;
  const defaultDir = pluginOptions.dir || process.cwd();
  const plasmicDir = path.join(defaultDir, ".cache", ".plasmic");

  if (pluginOptions.watch != null) {
    watch = pluginOptions.watch;
  }

  const defaultOptions: PlasmicOpts = {
    initArgs: {
      platform: "gatsby",
      "pages-dir": "./pages",
      "images-public-dir": "../../../public",
      "src-dir": "./components",
    },
    projects: [],
    dir: defaultDir,
    watch,
    plasmicDir,
    pageDir: path.join(plasmicDir, "pages"),
    substitutions: {} as Substitutions,
  };

  config = await convertOptsToLoaderConfig(pluginOptions, defaultOptions);
  return initLoader(config);
}

let createPageParam: any = {};

async function onGatsbyPostBootstrap() {
  return onPostInit(config, watch, async (pages) => {
    const existingPages = await createPageParam.graphql(`
      {
        allSitePage {
          edges {
            node {
              path
            }
          }
        }
      }`);
    const existingPagesMap = Object.fromEntries(
      existingPages.data.allSitePage.edges.map((page: any) => [
        page.node.path,
        true,
      ])
    );

    pages
      .filter(
        (page) =>
          !existingPagesMap[page.url] && !existingPagesMap[page.url + "/"]
      )
      .forEach((page) =>
        createPageParam.actions.createPage({
          path: page.url,
          component: page.path,
          context: {},
        })
      );
  });
}

exports.createPagesStatefully = (opts: any) => (createPageParam = opts);

exports.onPreBootstrap = (_: any, pluginOptions: PluginOptions) =>
  onGatsbyPreBootstrap(pluginOptions).catch((e) => logger.crash(e.message, e));

exports.onPostBootstrap = () =>
  onGatsbyPostBootstrap().catch((e) => logger.crash(e.message, e));
