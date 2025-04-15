import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreWorkspaces: [".", "packages/**/*", "plasmicpkgs/**/*"],
  workspaces: {
    "platform/analytics": {
      entry: ["src/entry-app.ts", "src/entry-prepare-salt.ts"],
      project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
    },
    "platform/wab": {
      entry: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
      project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
      ignoreDependencies: [
        "coffeescript", // used by pegcoffee
        "dotenv", // used by tools/run.bash
        "util", // used by multiple client files
        "ts-node", // used by scripts

        "@types/chrome", // for `window.chrome`
        "@types/socket.io-client", // for `socket.io-client`

        // used by make
        "pegjs",
        "pegjs-coffee-plugin",
        "prismjs",

        // used by react-icons
        "font-awesome",
        "@fortawesome/.+",

        // below deps are not verified to actually be needed

        "url", // used by cli-routes?

        // used by jest?
        "@babel/plugin-proposal-decorators",
        "@babel/preset-typescript",

        // used by cypress?
        "@sucrase/webpack-loader",
        "browserify-zlib",
        "buffer",
        "https-browserify",
        "lodash-es",
        "os-browserify",
        "path-browserify",
        "stream-browserify",
        "stream-http",

        // used by react-use?
        "keyboardjs",
        "rebound",
      ],
    },
  },
};

export default config;
