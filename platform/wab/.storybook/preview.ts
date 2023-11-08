import "@/initTests";

import "@/wab/styles/antd-overrides.less";
import "@/wab/styles/loader.scss";
import "@/wab/styles/main.sass";
import type { Preview } from "@storybook/react";
import { StudioCtxDecorator } from "./StudioCtxDecorator";

const preview: Preview = {
  decorators: [StudioCtxDecorator],
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
