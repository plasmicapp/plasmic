import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import sucrase from "@rollup/plugin-sucrase";
import sourcemaps from "rollup-plugin-sourcemaps";
import { terser } from "rollup-plugin-terser";

const isProd = process.env.NODE_ENV === "production";

export default {
  input: "src/index.ts",
  output: [
    {
      dir: "build",
      entryFileNames: "loader-hydrate.[hash].js",
      format: "iife",
      sourcemap: true,
    },
    {
      file: "build/loader-hydrate.js",
      format: "iife",
      sourcemap: true,
    },
  ],
  treeshake: {
    moduleSideEffects: false,
  },
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs({
      ignore: ["http", "https", "node-fetch"],
    }),
    json(),
    sucrase({
      exclude: ["node_modules/**"],
      transforms: ["typescript"],
    }),
    replace({
      preventAssignment: true,
      values: {
        // Get production-mode react
        "process.env.NODE_ENV": JSON.stringify(
          isProd ? "production" : "development"
        ),
      },
    }),
    sourcemaps(),
    ...(isProd ? [terser()] : []),
  ],
};
