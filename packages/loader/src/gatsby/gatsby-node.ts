import path from "upath";
import { generateEntrypoint, PlasmicOpts } from "../shared";

type PluginOptions = Partial<PlasmicOpts>;

exports.onPreBootstrap = (_: any, pluginOptions: PluginOptions) => {
  const defaultDir = pluginOptions.dir || process.cwd();
  const defaultOptions = {
    initArgs: {
      platform: "gatsby",
      "pages-dir": "./pages",
      "images-public-dir": "../../../public",
      "src-dir": "./components",
    },
    dir: defaultDir,
    watch: process.env.NODE_ENV === "development",
    plasmicDir: path.join(defaultDir, ".cache", ".plasmic"),
    pageDir: path.join(defaultDir, "src", "pages"),
  };

  return generateEntrypoint({
    ...defaultOptions,
    ...pluginOptions,
  } as PlasmicOpts);
};
