import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import analyze from "rollup-plugin-analyzer";
import bundleSize from "rollup-plugin-bundle-size";
import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

const { name } = pkg;

const isProduction = !process.env.ROLLUP_WATCH;

export default {
  input: "src/index.js",
  output: [
    {
      file: pkg.module,
      format: "es",
      sourcemap: true,
    },
    {
      file: pkg.main,
      format: "umd",
      sourcemap: true,
      name,
    },
  ],
  plugins: [
    replace({
      "process.env.NODE_ENV": `"production"`,
      preventAssignment: true,
    }),
    svelte({
      emitCss: false,
    }),
    resolve({
      browser: true,
    }),
    commonjs({
      transformMixedEsModules: true,
    }),
    isProduction && terser(),
    isProduction && analyze(),
    isProduction && bundleSize(),
  ],
  watch: {
    clearScreen: false,
  },
};
