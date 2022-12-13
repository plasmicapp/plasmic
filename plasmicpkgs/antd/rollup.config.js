import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import esbuild from "rollup-plugin-esbuild";

const SKINNY_INPUTS = [
  "./src/registerButton.ts",
  "./src/registerCarousel.ts",
  "./src/registerCheckbox.tsx",
  "./src/registerCollapse.tsx",
  "./src/registerDropdown.tsx",
  "./src/registerInput.ts",
  "./src/registerMenu.ts",
  "./src/registerOption.ts",
  "./src/registerSelect.ts",
  "./src/registerSlider.tsx",
  "./src/registerSwitch.ts",
  "./src/registerTabs.tsx",
  "./src/registerTable.tsx",
];

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
