import path from "upath";
import { initLoader, onPostInit, PlasmicOpts } from "../shared";

type PluginOptions = Partial<PlasmicOpts>;

let opts: PlasmicOpts;
exports.onPreBootstrap = (_: any, pluginOptions: PluginOptions) => {
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
  };

  opts = {
    ...defaultOptions,
    ...pluginOptions,
  } as PlasmicOpts;

  return initLoader(opts);
};

let createPageParam: any = {};
exports.createPagesStatefully = (opts: any) => (createPageParam = opts);

exports.onPostBootstrap = async () => {
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
};
