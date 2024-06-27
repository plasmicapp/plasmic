import type { Config } from "jest";

const config: Config = {
  roots: ["<rootDir>/src"],
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/wab/client/test/setupTests.js"],
  snapshotSerializers: ["enzyme-to-json/serializer"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
  ],
  testEnvironment: "jsdom",
  transform: {
    "^.+Entities\\.(js|jsx|mjs|cjs|ts|tsx)$": [
      "babel-jest",
      {
        plugins: [["@babel/plugin-proposal-decorators", { version: "legacy" }]],
        presets: ["@babel/preset-env", "@babel/preset-typescript"],
      },
    ],
    "^.+\\.(js|jsx|mjs|cjs|ts|tsx)$": "@sucrase/jest-plugin",
    "^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)":
      "<rootDir>/__mocks__/file-transform.js",
  },
  transformIgnorePatterns: [
    ".+\\.(js|jsx|mjs|cjs|ts|tsx)foo$",
    "XXX/node_modules/(?!(@plasmicapp/react-web/lib/|private-ip|ip-regex|get-port|@chainsafe)).+\\.(js|jsx|mjs|cjs|ts|tsx)$",
  ],
  modulePaths: [],
  moduleNameMapper: {
    "^.+\\.(css|sass|scss)$": "identity-obj-proxy",
    "^commons/(.*)$": "<rootDir>/src/commons/$1",
    "^test_util/(.*)$": "<rootDir>/src/test_util/$1",
    "react-markdown": "identity-obj-proxy",
    "!css-loader!(.*)": "$1",
    "^src/(.*)$": "<rootDir>/src/$1",
    "^@/(.*)": "<rootDir>/src/$1",
    "^!file-loader!": "<rootDir>/__mocks__/file-loader-mock.js",
    "^!!raw-loader!(.*)$": "$1",
  },
  moduleFileExtensions: [
    "web.js",
    "js",
    "web.ts",
    "ts",
    "web.tsx",
    "tsx",
    "json",
    "web.jsx",
    "jsx",
    "cjs",
    "node",
  ],
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
  ],
  resetMocks: true,
  reporters: [
    process.env.CI ? ["github-actions", { silent: false }] : "default",
    "summary",
  ],
  // Workaround to "TypeError: Cannot assign to read only property
  // 'structuredClone' of object '[object global]'", which started when
  // upgrading node from 18.17.1 to 18.19.0.
  globals: {
    structuredClone: {},
  },
};

export default config;
