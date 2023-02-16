
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import esbuild from "rollup-plugin-esbuild";
import replaceImports from "rollup-plugin-replace-imports";
import glob from "glob";
const SKINNY_INPUTS = glob.sync('./src/register*.ts*');
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
      },
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        interop: "auto",
        plugins: [
          replaceImports(n => {
            // Swap antd/es/* with antd/lib/* to use commonjs versions
            // of the antd modules
            const match = n.match(/^antd\/es\/(.*)/);
            if (match) {
              return `antd/lib/${match[1]}`;
            }
            return n;
          })
        ]
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
        format: "esm",
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
];
