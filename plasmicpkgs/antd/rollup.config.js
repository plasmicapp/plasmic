import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import typescript from "rollup-plugin-typescript2";
import ts from "typescript";

export default [
  {
    input: [
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
    ],
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
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      json(),
      typescript({
        typescript: ts,
        check: false,
      }),
    ],
  }
]