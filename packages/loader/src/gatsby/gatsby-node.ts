import path from "upath";
import { initLoader, onPostInit } from "../shared";
import * as logger from "../shared/logger";
import type {
  PlasmicOpts,
  PluginOptions,
  Substitutions,
} from "../shared/types";

let opts: PlasmicOpts;

async function onGatsbyPreBootstrap(pluginOptions: PluginOptions) {
  // This is passed by Gatsby, here we're deleting it to make sure
  // the plugin options only contains known keys.
  delete (pluginOptions as any).plugins;
  const defaultDir = pluginOptions.dir || process.cwd();
  const plasmicDir = path.join(defaultDir, ".cache", ".plasmic");

  const defaultOptions = {
    initArgs: {
      platform: "gatsby",
      "pages-dir": "./pages",
      "images-public-dir": "../../../public",
      "src-dir": "./components",
    },
    dir: defaultDir,
    watch: process.env.NODE_ENV === "development",
    plasmicDir,
    pageDir: path.join(plasmicDir, "pages"),
    substitutions: {} as Substitutions,
  };

  opts = {
    ...defaultOptions,
    ...pluginOptions,
    initArgs: {
      ...defaultOptions.initArgs,
      ...pluginOptions.initArgs,
    },
  };

  return initLoader(opts);
}

let createPageParam: any = {};

async function onGatsbyPostBootstrap() {
  return onPostInit(opts, async (pages) => {
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
