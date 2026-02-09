import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreWorkspaces: [".", "packages/**/*", "plasmicpkgs/**/*"],
  workspaces: {
    "platform/analytics-rproxy": {
      entry: ["src/entry-app.ts", "src/entry-prepare-salt.ts"],
      project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
    },
    "platform/hosting": {
      entry: ["middleware.ts", "pages/**/*.{ts,tsx}"],
      project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
      ignoreDependencies: [
        "eslint", // used by next
      ],
    },
    "platform/mini-cache": {
      entry: ["src/entry-app.ts"],
      project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
    },
    "platform/wab": {
      entry: ["src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
      project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
      ignoreDependencies: [
        "coffeescript", // used by pegcoffee
        "dotenv", // used by tools/run.bash
        "util", // used by multiple client files
        "ts-node", // used by scripts

        "@types/chrome", // for `window.chrome`

        // used by make
        "pegjs",
        "pegjs-coffee-plugin",
        "prismjs",

        // used by react-icons
        "font-awesome",
        "@fortawesome/.+",

        // below deps are not verified to actually be needed

        "buffer", // used by StudioHtmlPlugin.ts?
        "url", // used by route.ts?

        // used by jest?
        "@babel/plugin-proposal-decorators",
        "@babel/preset-env",
        "@babel/preset-typescript",
      ],
    },
  },
};

export default config;
