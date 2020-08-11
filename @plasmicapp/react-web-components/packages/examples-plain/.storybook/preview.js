import {configureActions} from "@storybook/addon-actions";

configureActions({
  depth: 2,
  limit: 10
});

export const parameters = {
  actions: { argTypesRegex: '^on.*' }
};