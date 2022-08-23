import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import dts from "rollup-plugin-dts";
import typescript from "rollup-plugin-typescript2";
import ts from "typescript";

export default [
  // We use tsdx to build react-web. This config is used only to roll up
  // all type definitions into dist/index.d.ts after the build.
  {
    input: "./dist/index.d.ts",
    output: [{ file: "dist/all.d.ts", format: "es" }],
    plugins: [dts({ respectExternal: true })],
    external: ["react"],
  },

  // We also do a "skinny" build here that bundles each Plume component as a
  // separate entrypoint, and exclude them from the main entrypoint.  This makes
  // it possible to do better tree-shaking by PlasmicLoader -- react-aria checkbox
  // code will only be included if the react-aria checkbox is actually used in the
  // PlasmicLoader entrypoint component, not if it is used by _any_ component in
  // the project.
  {
    input: {
      index: "./src/index-skinny.tsx",
      "plume/button/index": "./src/plume/button/index.tsx",
      "plume/checkbox/index": "./src/plume/checkbox/index.tsx",
      "plume/menu/index": "./src/plume/menu/index.ts",
      "plume/menu-button/index": "./src/plume/menu-button/index.tsx",
      "plume/select/index": "./src/plume/select/index.tsx",
      "plume/switch/index": "./src/plume/switch/index.tsx",
      "plume/text-input/index": "./src/plume/text-input/index.tsx",
      "plume/triggered-overlay/index":
        "./src/plume/triggered-overlay/index.tsx",
      "render/PlasmicHead/index": "./src/render/PlasmicHead/index.tsx",
      "render/PlasmicImg/index": "./src/render/PlasmicImg/index.tsx",
    },
    external: (id) => {
      if (id.startsWith("regenerator-runtime") || id.startsWith("tslib")) {
        return false;
      }
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    output: [
      {
        dir: "skinny/dist",
        format: "esm",
        sourcemap: true,
        globals: { react: "React" },
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
      }),
    ],
  },
];
