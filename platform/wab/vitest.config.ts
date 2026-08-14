import { isBuiltin } from "module";
import os from "os";
import path from "path";
import { defineConfig, Plugin } from "vitest/config";

const srcDir = path.join(__dirname, "src");

// jsdom makes vite resolve for the browser, which picks npm shims such as
// path@0.12.7 over the real builtins. Tests run in node, so use the builtins.
function nodeBuiltins(): Plugin {
  return {
    name: "node-builtins",
    enforce: "pre",
    resolveId(source) {
      return isBuiltin(source)
        ? {
            id: source.startsWith("node:") ? source : `node:${source}`,
            external: true,
          }
        : null;
    },
  };
}

// Resolves webpack loader-prefixed imports, e.g. `!!raw-loader!./foo.txt`, by
// dropping the prefix and reading the file as a string.
function webpackLoaderPrefixes(): Plugin {
  return {
    name: "webpack-loader-prefixes",
    enforce: "pre",
    async resolveId(source, importer) {
      const match = /^!+[\w-]+!(.*)$/.exec(source);
      if (!match) {
        return null;
      }
      const resolved = await this.resolve(match[1], importer, {
        skipSelf: true,
      });
      return resolved ? `${resolved.id}?raw` : null;
    },
  };
}

// Tests never assert on plain stylesheets, so skip preprocessing them
// entirely. CSS modules are left alone, since tests do assert on their keys.
function stubStylesheets(): Plugin {
  return {
    name: "stub-stylesheets",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0];
      return /\.(css|sass|scss|less)$/.test(file) &&
        !/\.module\.\w+$/.test(file)
        ? ""
        : null;
    },
  };
}

export default defineConfig({
  plugins: [nodeBuiltins(), webpackLoaderPrefixes(), stubStylesheets()],
  server: {
    // The codegen tests compile into a temp dir and import the result.
    fs: { allow: [path.join(__dirname, "../.."), os.tmpdir()] },
  },
  resolve: {
    alias: {
      "@/": `${srcDir}/`,
      "src/": `${srcDir}/`,
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          include: [
            "src/wab/server/**/*.{spec,test}.{js,jsx,ts,tsx}",
            "tools/webpack/**/*.{spec,test}.{js,jsx,ts,tsx}",
          ],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "studio",
          // Server and webpack utility tests use the node project above.
          include: ["src/**/*.{spec,test}.{js,jsx,ts,tsx}"],
          exclude: ["src/wab/server/**"],
          environment: "jsdom",
          // DEVFLAGS.hostUrl is http://localhost in tests; keep the document on
          // the same origin so app-hosting URL checks pass.
          environmentOptions: {
            jsdom: {
              url: "http://localhost/",
              // Several tests parse untrusted HTML; don't run its <script>s.
              runScripts: "outside-only",
            },
          },
        },
      },
    ],
    globals: true,
    silent: "passed-only",
    setupFiles: ["./src/wab/client/test/setupTests.js"],
    coverage: {
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
    },
    // Generated code asserts on its own CSS module class names.
    css: { modules: { classNameStrategy: "non-scoped" } },
    // Modules read these at import time, so they must be set before the test
    // file's imports run, which rules out assigning them in a setup file.
    env: {
      COMMITHASH: "test",
      PUBLICPATH: "/",
      AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE: "1",
    },
    testTimeout: 60000,
    hookTimeout: 60000,
    restoreMocks: true,
  },
});
