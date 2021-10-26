import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import typescript from "rollup-plugin-typescript2";
import ts from "typescript";

export default [
  // We provide a light-weigth module for component registration which can be
  // used for component substitution of code components by loader
  {
    input: {
      index: "./src/registerComponent.ts",
    },
    external: (id) => {
      if (id.startsWith("regenerator-runtime")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        dir: "registerComponent/dist",
        entryFileNames: "index.esm.js",
        format: "esm",
        sourcemap: true,
      },
      {
        dir: "registerComponent/dist",
        entryFileNames: "index.cjs.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      json(),
      typescript({
        typescript: ts,
        check: false,
        tsconfigOverride: {
          include: ["src/registerComponent.ts"],
        },
      }),
    ],
  },
];