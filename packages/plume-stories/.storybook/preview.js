import { configureActions } from "@storybook/addon-actions";

configureActions({
  depth: 2,
  limit: 20,
});

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
