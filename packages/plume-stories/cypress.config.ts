import { defineConfig } from "cypress";

export default defineConfig({
  component: {
    setupNodeEvents(on, config) {},
    specPattern: "src/**/*spec.{js,jsx,ts,tsx}",
    devServer: {
      framework: "create-react-app",
      bundler: "webpack",
    },
  },
});
