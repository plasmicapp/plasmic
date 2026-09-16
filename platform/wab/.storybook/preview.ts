import {
  AntdConfigProvider,
  configureAntdStatics,
} from "@/wab/client/antd-theme";
import "@/wab/client/moment-config";
import { initObservability } from "@/wab/client/observability";
import "@/wab/styles/antd-overrides.scss";
import "@/wab/styles/loader.scss";
import "@/wab/styles/main.sass";
import type { Preview } from "@storybook/react";
import React from "react";
import { StudioCtxDecorator } from "./StudioCtxDecorator";

initObservability();
configureAntdStatics();

const preview: Preview = {
  decorators: [
    (Story) => React.createElement(AntdConfigProvider, null, Story()),
    StudioCtxDecorator,
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
