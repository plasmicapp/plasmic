import path from "path";
import { generateEntrypoint, PlamicOpts } from "../shared";

type PluginOptions = Partial<PlamicOpts>;

exports.onPreBootstrap = (_: any, pluginOptions: PluginOptions) => {
  if (pluginOptions.watch === undefined) {
    pluginOptions.watch = process.env.NODE_ENV === "development";
  }
  if (pluginOptions.dir === undefined) {
    pluginOptions.dir = process.cwd();
  }
  if (pluginOptions.plasmicDir === undefined) {
    pluginOptions.plasmicDir = path.join(pluginOptions.dir, ".cache", '.plasmic');
  }

  pluginOptions.pageDir = path.join(pluginOptions.dir, "src", "pages");
  return generateEntrypoint({
    initArgs: {
      platform: "gatsby",
      "pages-dir": "../pages",
      "src-dir": "./components",
    },
    ...(pluginOptions as PlamicOpts),
  });
};
