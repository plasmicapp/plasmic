import { generateEntrypoint, PlamicOpts } from "../shared";

exports.onPreInit = async (_: any, pluginOptions: PlamicOpts) => {
  generateEntrypoint(pluginOptions);
};
