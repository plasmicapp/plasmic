import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import glob from "glob";
import path from "path";
import esbuild from "rollup-plugin-esbuild";

const SKINNY_INPUTS = glob
  .sync("./src/register*.ts*")
  .filter((file) => !file.includes("stories"));

export default [
  {
    input: ["./src/index.tsx"],
    external: (id) => {
      if (id.startsWith("regenerator-runtime") || id.startsWith("tslib")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        file: "dist/react-aria.esm.js",
        format: "esm",
        sourcemap: true,
        exports: "named",
      },
      {
        file: "dist/react-aria.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        interop: "auto",
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      json(),
      esbuild({
        loaders: {
          ".json": "json",
        },
      }),
    ],
  },
  {
    input: SKINNY_INPUTS,
    external: (id) => {
      if (id.startsWith("regenerator-runtime") || id.startsWith("tslib")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        dir: "skinny",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        interop: "auto",
        entryFileNames: `[name].cjs.js`,
        chunkFileNames: `[name]-[hash].cjs.js`,
      },
      {
        dir: "skinny",
        format: "esm",
        sourcemap: true,
        exports: "named",
        interop: "auto",
        entryFileNames: `[name].esm.js`,
        chunkFileNames: `[name]-[hash].esm.js`,
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      json(),
      esbuild({
        loaders: {
          ".json": "json",
        },
      }),
    ],
  },
];
