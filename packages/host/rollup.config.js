import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import typescript from "rollup-plugin-typescript2";
import ts from "typescript";

const external = (id) => {
  if (id.startsWith("regenerator-runtime") || id.startsWith("tslib")) {
    return false;
  }
  return !id.startsWith(".") && !path.isAbsolute(id);
};

export default [
  {
    input: {
      index: "./src/index.ts",
    },
    external,
    output: [
      {
        dir: "dist",
        entryFileNames: "host.esm.js",
        format: "esm",
        sourcemap: true,
        banner: "'use client';",
      },
      {
        dir: "dist",
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
          emitDeclarationOnly: true,
        },
      }),
    ],
  },
  // We provide a light-weight module for component registration which can be
  // used for component substitution of code components by loader
  {
    input: {
      index: "./src/registerComponent.ts",
    },
    external,
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
          emitDeclarationOnly: true,
        },
      }),
    ],
  },
  {
    input: {
      index: "./src/registerGlobalContext.ts",
    },
    external,
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
          emitDeclarationOnly: true,
        },
      }),
    ],
  },
  {
    input: {
      index: "./src/registerTrait.ts",
    },
    external,
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
          emitDeclarationOnly: true,
        },
      }),
    ],
  },
  {
    input: {
      index: "./src/registerToken.ts",
    },
    external,
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
          emitDeclarationOnly: true,
        },
      }),
    ],
  },
];
