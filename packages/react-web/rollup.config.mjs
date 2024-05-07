import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import dts from "rollup-plugin-dts";
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
      index: "./src/index.tsx",
    },
    external,
    output: [
      {
        dir: "dist",
        entryFileNames: "react-web.esm.js",
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
  // This rolls up all the types into a single all.d.ts, which is used by
  // DocsPortalEditor
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
    external,
    output: [
      {
        dir: "skinny/dist",
        format: "esm",
        sourcemap: true,
        globals: { react: "React" },
        exports: "named",
        entryFileNames: "[name].js",
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
  // We build packages under lib/ that just re-exports some other @plasmicapp packages.
  // This makes sure they don't end up in the main package (which loader will embed).
  {
    input: {
      "data-sources/index": "./src/data-sources/index.ts",
      "host/index": "./src/host/index.ts",
      "query/index": "./src/query/index.ts",
      "prepass/index": "./src/prepass/index.ts",
      "auth/index": "./src/auth/index.ts",
      "splits/index": "./src/splits/index.ts",
      "nextjs-app-router/index": "./src/nextjs-app-router/index.ts",
      "nextjs-app-router/react-server/index":
        "./src/nextjs-app-router/react-server/index.tsx",
    },
    external,
    output: [
      {
        dir: "lib",
        format: "esm",
        sourcemap: true,
        globals: { react: "React" },
        entryFileNames: "[name].js",
        exports: "named",
      },
      {
        dir: "lib",
        entryFileNames: "[name].cjs.js",
        format: "cjs",
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
        tsconfigOverride: {
          include: [
            "src/data-sources",
            "src/host",
            "src/query",
            "src/prepass",
            "src/auth",
            "src/splits",
            "src/nextjs-app-router",
            "src/nextjs-app-router/react-server",
          ],
          emitDeclarationOnly: true,
        },
      }),
    ],
  },
];
