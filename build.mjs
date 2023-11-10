/**
 * Validates package.json and builds bundles in a consistently across our packages.
 */

import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import console from "console";
import esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import process from "process";

async function main() {
  if (process.argv.length < 3) {
    throw new Error("missing entry point");
  }

  const entryPoint = process.argv[2];
  const options = process.argv.slice(3);

  const useClient = findAndRemoveOption(options, "--use-client");
  // TODO: default ESM extension should be "mjs" once we figure out how to use .mjs properly
  const defaultEsmExtension = "esm.js";
  // Some packages may not work with a .mjs extension due to the stricter Node ES module rules.
  // loader-react uses it for "react/jsx-runtime" imports.
  // See https://app.shortcut.com/plasmic/story/33688/es-module-support for more details.
  const esmExtension = findAndRemoveOption(options, "--no-esm")
    ? null
    : findAndRemoveOption(options, "--no-mjs")
    ? "esm.js"
    : defaultEsmExtension;
  const watch = findAndRemoveOption(options, "--watch");
  if (options.length > 0) {
    throw new Error(`unknown or duplicate options: ${options.join(" ")}`);
  }

  const name = path.parse(entryPoint).name;
  const subpath = name === "index" ? "." : `./${name}`;

  const expectedPackageJson = generateExpectedPackageJson(
    name,
    subpath,
    esmExtension
  );
  const actualPackageJson = JSON.parse(
    await fs.readFile(path.resolve("package.json"))
  );
  validatePackageJson(actualPackageJson, expectedPackageJson);
  validatePackageJsonReactServerConditional(actualPackageJson);

  await buildBundle({
    entryPoint,
    name,
    esmExtension,
    useClient,
    watch,
  });
  await extractApi({
    name,
    dtsRollupPath: expectedPackageJson.exports[subpath].types,
  });
}

function findAndRemoveOption(options, option) {
  const index = options.indexOf(option);
  const found = index >= 0;
  if (found) {
    options.splice(index, 1);
  }
  return found;
}

function generateExpectedPackageJson(name, subpath, esmExtension) {
  const packageJson = {
    exports: {
      [subpath]: generateExpectedPackageJsonSubpath(name, esmExtension),
    },
  };

  if (name === "index") {
    packageJson.types = "./dist/index.d.ts";
    packageJson.main = "./dist/index.js";
    if (esmExtension) {
      // "index.esm.js" should be set as the "module" field for webpack 4 and other tools,
      // since they don't support the "exports" field.
      // We change the extension from ".mjs" to ".js" because ".mjs" doesn't work properly in webpack 4.
      // https://github.com/adobe/react-spectrum/pull/4038
      packageJson.module = "./dist/index.esm.js";
    }
  }

  return packageJson;
}

function generateExpectedPackageJsonSubpath(name, esmExtension) {
  if (esmExtension) {
    return {
      types: `./dist/${name}.d.ts`,
      import: `./dist/${name}.${esmExtension}`,
      require: `./dist/${name}.js`,
    };
  } else {
    return {
      types: `./dist/${name}.d.ts`,
      default: `./dist/${name}.js`,
    };
  }
}

/** Validates that `expected` is a subset of `actual`. Throws if not. */
function validatePackageJson(actual, expected, path = "") {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const nestedPath = path ? `${path} > "${key}"` : `"${key}"`;
    if (!(key in actual)) {
      throw new Error(`package.json ${nestedPath} field missing`);
    }

    if (typeof expectedValue === "string") {
      if (expectedValue !== actual[key]) {
        throw new Error(
          `package.json ${nestedPath} field should be "${expectedValue}"`
        );
      }
    } else {
      validatePackageJson(actual[key], expectedValue, nestedPath);
    }
  }
}

function validatePackageJsonReactServerConditional(packageJson) {
  const indexSubpath = packageJson.exports["."];
  const reactServerSubpath = packageJson.exports["./react-server"];
  const reactServerConditionalSubpath =
    packageJson.exports["./react-server-conditional"];
  if (indexSubpath && reactServerSubpath && reactServerConditionalSubpath) {
    validatePackageJson(
      reactServerConditionalSubpath,
      {
        "react-server": reactServerSubpath,
        default: indexSubpath,
      },
      '"exports" > "./react-server-conditional"'
    );
  }
}

async function buildBundle({
  entryPoint,
  name,
  esmExtension,
  useClient,
  watch,
}) {
  const formats = esmExtension ? ["cjs", "esm"] : ["cjs"];
  return Promise.all(
    formats.map(async (format) => {
      const outfile = `dist/${name}.${format === "cjs" ? "js" : esmExtension}`;
      const esbuildOptions = {
        bundle: true,
        packages: "external", // don't bundle node_modules

        entryPoints: [entryPoint],
        format,
        target: "es6",
        outfile,

        // This means we are not targeting node or browser specifically, which is
        // how our libraries work. Targeting node or browser specifically has
        // implications on what is used as `process.env.NODE_ENV` among other
        // things; see https://esbuild.github.io/api/#platform
        platform: "neutral",

        banner: {
          js: useClient ? `"use client";` : ``,
        },

        sourcemap: true,
      };
      if (watch) {
        await (await esbuild.context(esbuildOptions)).watch();
        console.info(
          `watching and rebuilding ${format.toUpperCase()} bundle at "${outfile}"...`
        );
      } else {
        await esbuild.build(esbuildOptions);
        console.info(`built ${format.toUpperCase()} bundle at "${outfile}"`);

        // Copy "index.mjs" to "index.esm.js".
        // "index.esm.js" should be set as the "module" field for webpack 4 and other tools,
        // since they don't support the "exports" field.
        // We change the extension from ".mjs" to ".js" because ".mjs" doesn't work properly in webpack 4.
        // https://github.com/adobe/react-spectrum/pull/4038
        if (outfile === "dist/index.mjs") {
          await fs.copyFile("dist/index.mjs", "dist/index.esm.js");
          console.info(
            `built ${format.toUpperCase()} bundle at "dist/index.esm.js"`
          );
        }
      }
    })
  );
}

/**
 * Runs API Extractor, which outputs the following:
 * - `./api/${name}.api.md` - API report for diffing API changes.
 *                            This file should be checked into version control.
 * - `./dist/${name}.d.ts`  - Rollup of TypeScript declaration files (.d.ts).
 *
 * Currently, this process depends on `tsc` being run externally with the
 * TS config at `../../tsconfig.types.json` with output to `./api/tsc`.
 * The reason `tsc` is not run in this script yet is because some packages run
 * this script multiple times for multiple entry points, which would result in
 * duplicative `tsc` runs.
 */
function extractApi({ name, dtsRollupPath, docModelPath }) {
  // Excluding non-index entry points for now since we can't handle multiple entry points.
  // TODO: https://linear.app/plasmic/issue/PLA-10114
  const docModelEnabled = name === "index";

  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      apiReport: {
        enabled: true,
        reportFolder: path.resolve("./api"),
        reportTempFolder: path.resolve("./api/temp"),
        reportFileName: `${name}.api.md`,
      },
      compiler: {
        tsconfigFilePath: path.resolve("./tsconfig.json"),
      },
      docModel: {
        enabled: docModelEnabled,
        apiJsonFilePath: path.resolve(`./api/temp/${name}.api.json`),
      },
      dtsRollup: {
        enabled: true,
        untrimmedFilePath: path.resolve(dtsRollupPath),
      },
      mainEntryPointFilePath: path.resolve(`./api/tsc/${name}.d.ts`),
      newlineKind: "lf",
      projectFolder: path.resolve("."),
    },
    packageJsonFullPath: path.resolve("./package.json"),
  });
  const extractorResult = Extractor.invoke(extractorConfig, {
    showVerboseMessages: true,
    // On local builds, API reports will automatically be updated.
    // On CI builds, API report changes will result in a failed build.
    localBuild: !process.env.CI,
  });

  if (!extractorResult.succeeded) {
    throw new Error(
      `API Extractor completed with ${extractorResult.errorCount} errors` +
        ` and ${extractorResult.warningCount} warnings`
    );
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
