import path from "path";
import { generateEntrypoint, PlamicOpts } from "../shared";

type PluginOptions = Omit<PlamicOpts, "pageDir"> & { pageDir?: string };

exports.onPreInit = async (_: any, pluginOptions: PluginOptions) => {
  if (pluginOptions.watch === undefined) {
    pluginOptions.watch = process.env.NODE_ENV === "development";
  }
  generateEntrypoint({
    initArgs: {
      platform: "gatsby",
      "pages-dir": "../pages",
    },
    pageDir: path.join(pluginOptions.dir, "src", "pages"),
    ...pluginOptions,
  });
};
