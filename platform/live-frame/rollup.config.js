import postcss from "rollup-plugin-postcss";
import sucrase from "@rollup/plugin-sucrase";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import { terser } from "rollup-plugin-terser";

const isProd = process.env.NODE_ENV === "production";

export default {
  input: "src/index.ts",
  output: {
    file: "build/client.js",
    format: "iife",
    sourcemap: true,
  },
  plugins: [
    resolve(),
    commonjs(),
    postcss(),
    sucrase({
      exclude: ["node_modules/**"],
      transforms: ["typescript"],
    }),
    replace({
      // Get production-mode react
      "process.env.NODE_ENV": JSON.stringify(
        isProd ? "production" : "development"
      ),
    }),
    ...(isProd ? [terser()] : []),
  ],
};
