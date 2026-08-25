import "@/initTests";

import {
  AntdConfigProvider,
  configureAntdStatics,
} from "@/wab/client/antd-theme";
import "@/wab/styles/antd-overrides.scss";
import "@/wab/styles/loader.scss";
import "@/wab/styles/main.sass";
import type { Preview } from "@storybook/react";
import React from "react";
import { StudioCtxDecorator } from "./StudioCtxDecorator";

configureAntdStatics();

const preview: Preview = {
  decorators: [
    (Story) => React.createElement(AntdConfigProvider, null, Story()),
    StudioCtxDecorator,
  ],
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
