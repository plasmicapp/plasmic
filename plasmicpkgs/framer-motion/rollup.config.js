import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import typescript from "rollup-plugin-typescript2";
import ts from "typescript";

const moduleNames = ["AnimatedLetters"];

export default [
  ...moduleNames.map((moduleName) => ({
    input: {
      index: `./src/${moduleName}.tsx`,
    },
    external: (id) => {
      if (id.startsWith("regenerator-runtime") || id.startsWith("tslib")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        dir: `${moduleName}/dist`,
        entryFileNames: "index.esm.js",
        format: "esm",
        sourcemap: true,
      },
      {
        dir: `${moduleName}/dist`,
        entryFileNames: "index.cjs.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        typescript: ts,
        check: false,
        tsconfigOverride: {
          include: [`src/${moduleName}.tsx`],
        },
      }),
    ],
  })),
];