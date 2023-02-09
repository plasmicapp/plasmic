import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import glob from "glob";
import path from "path";
import esbuild from "rollup-plugin-esbuild";
import replaceImports from "rollup-plugin-replace-imports";

const SKINNY_INPUTS = glob.sync('./src/register*.ts*');

const toEsmImports = replaceImports(n => {
  // Swap antd/lib/* with antd/es/* to use esm versions
  // of the antd modules
  const match = n.match(/^antd\/lib\/(.*)/);
  if (match) {
    return `antd/es/${match[1]}`;
  }
  return n;
});

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
        file: "dist/antd.esm.js",
        format: "esm",
        sourcemap: true,
        exports: "named",
        plugins: [toEsmImports]
      },
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
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
        interop: "auto"
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
    ]
  },
];
