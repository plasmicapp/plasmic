import typescript from "rollup-plugin-typescript2";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import ts from "typescript";

const isProd = process.env.NODE_ENV === "production";

function getPlugins() {
  return [
    resolve(),
    commonjs(),
    typescript({
      typescript: ts,
      check: false,
    }),
    replace({
      // Get production-mode react
      "process.env.NODE_ENV": JSON.stringify(
        isProd ? "production" : "development"
      ),
    }),
  ];
}

function makeBuild({ entrypoint, outputDir, moduleName }) {
  const builds = [
    {
      input: entrypoint,
      output: [
        {
          file: `${outputDir}/${moduleName}.cjs.js`,
          format: "cjs",
        },
        {
          file: `${outputDir}/${moduleName}.esm.js`,
          format: "esm",
        },
      ],
      plugins: getPlugins(),
      external: ["react", "react-dom", "@plasmicapp/react-web"],
    },
  ];
  return builds;
}

export default [
  ...makeBuild({
    entrypoint: "src/jsx-runtime.ts",
    outputDir: "jsx-runtime/dist",
    moduleName: "react-web-runtime-jsx-runtime",
  }),
  ...makeBuild({
    entrypoint: "src/jsx-dev-runtime.ts",
    outputDir: "jsx-dev-runtime/dist",
    moduleName: "react-web-runtime-jsx-dev-runtime",
  }),
];
