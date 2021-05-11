import dts from "rollup-plugin-dts";

// We use tsdx to build react-web. This config is used only to roll up
// all type definitions into dist/index.d.ts after the build.
export default [
  {
    input: "./dist/index.d.ts",
    output: [{ file: "dist/all.d.ts", format: "es" }],
    plugins: [dts({ respectExternal: true })],
    external: ["react"]
  }
];
