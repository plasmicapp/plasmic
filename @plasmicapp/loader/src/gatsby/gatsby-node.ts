import { generateEntrypoint, PlamicOpts } from "../shared";

exports.onPreInit = async (_: any, pluginOptions: PlamicOpts) => {
  if (pluginOptions.watch === undefined) {
    pluginOptions.watch = process.env.NODE_ENV === "development";
  }
  generateEntrypoint(pluginOptions);
};
