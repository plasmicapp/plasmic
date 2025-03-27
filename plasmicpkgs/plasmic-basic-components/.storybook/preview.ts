import { Preview } from "@storybook/react";
import { initialize, mswLoader } from "msw-storybook-addon";

const preview: Preview = {
  loaders: [initialize() && mswLoader],
};

export default preview;
