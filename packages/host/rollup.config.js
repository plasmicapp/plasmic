import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import typescript from "rollup-plugin-typescript2";
import ts from "typescript";

export default [
  // We provide a light-weight module for component registration which can be
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
        banner: "'use client';",
      },
      {
        dir: "registerComponent/dist",
        entryFileNames: "index.cjs.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        banner: "'use client';",
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
          include: ["src/registerComponent.ts", "src/element-types.ts"],
        },
      }),
    ],
  },
  {
    input: {
      index: "./src/registerGlobalContext.ts",
    },
    external: (id) => {
      if (id.startsWith("regenerator-runtime")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        dir: "registerGlobalContext/dist",
        entryFileNames: "index.esm.js",
        format: "esm",
        sourcemap: true,
        banner: "'use client';",
      },
      {
        dir: "registerGlobalContext/dist",
        entryFileNames: "index.cjs.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        banner: "'use client';",
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
          include: [
            "src/registerGlobalContext.ts",
            "src/registerComponent.ts",
            "src/element-types.ts",
          ],
        },
      }),
    ],
  },
  {
    input: {
      index: "./src/registerTrait.ts",
    },
    external: (id) => {
      if (id.startsWith("regenerator-runtime")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        dir: "registerTrait/dist",
        entryFileNames: "index.esm.js",
        format: "esm",
        sourcemap: true,
        banner: "'use client';",
      },
      {
        dir: "registerTrait/dist",
        entryFileNames: "index.cjs.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        banner: "'use client';",
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
          include: ["src/registerTrait.ts"],
        },
      }),
    ],
  },
  {
    input: {
      index: "./src/registerToken.ts",
    },
    external: (id) => {
      if (id.startsWith("regenerator-runtime")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        dir: "registerToken/dist",
        entryFileNames: "index.esm.js",
        format: "esm",
        sourcemap: true,
      },
      {
        dir: "registerToken/dist",
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
          include: ["src/registerToken.ts"],
        },
      }),
    ],
  },
];
