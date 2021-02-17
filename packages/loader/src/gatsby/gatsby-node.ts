import path from "path";
import { generateEntrypoint, PlamicOpts } from "../shared";

type PluginOptions = Omit<PlamicOpts, "pageDir"> & { pageDir?: string };

exports.onPreInit = (_: any, pluginOptions: PluginOptions) => {
  if (pluginOptions.watch === undefined) {
    pluginOptions.watch = process.env.NODE_ENV === "development";
  }
  return generateEntrypoint({
    initArgs: {
      platform: "gatsby",
      "pages-dir": "../pages",
      "src-dir": "./components",
    },
    pageDir: path.join(pluginOptions.dir, "src", "pages"),
    ...pluginOptions,
  });
};
