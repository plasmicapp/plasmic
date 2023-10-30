import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import esbuild from "rollup-plugin-esbuild";

export default [
  {
    input: ["./src/index.ts"],
    external: (id) => {
      if (id.startsWith("regenerator-runtime") || id.startsWith("tslib")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        interop: "auto",
      },
      {
        file: "dist/plasmic-chakra-ui.esm.js",
        format: "esm",
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
];
