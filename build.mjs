/**
 * Validates package.json and builds bundles in a consistently across our packages.
 */

import fs from 'fs/promises';
import console from 'console';
import path from 'path';
import process from 'process';
import esbuild from 'esbuild';

async function main() {
  if (process.argv.length < 3) {
    throw new Error('missing entry point');
  }

  const entryPoint = process.argv[2];
  const options = process.argv.slice(3);

  const useClient = findAndRemoveOption(options, '--use-client');
  // By default, we only ship cjs bundles. Use this option to also ship esm bundles.
  // However, there are many issues that need to be resolved before turning this option on.
  // https://app.shortcut.com/plasmic/story/33688/es-module-support
  const esm = findAndRemoveOption(options, '--esm-do-not-use');
  const watch = findAndRemoveOption(options, '--watch');
  if (options.length > 0) {
    throw new Error(`unknown or duplicate options: ${options.join(' ')}`);
  }

  const name = path.parse(entryPoint).name;

  const expectedPackageJson = generateExpectedPackageJson(name, esm);
  const actualPackageJson = JSON.parse(
    await fs.readFile(path.resolve('package.json'))
  );
  validatePackageJson(actualPackageJson, expectedPackageJson);

  const ctx = {
    entryPoint,
    name,
    formats: esm ? ['cjs', 'esm'] : ['cjs'],
    useClient,
    watch,
  };

  await buildBundle(ctx);
}

function findAndRemoveOption(options, option) {
  const index = options.indexOf(option);
  const found = index >= 0;
  if (found) {
    options.splice(index, 1);
  }
  return found;
}

function generateExpectedPackageJson(name, esm) {
  const subpath = name === 'index' ? '.' : `./${name}`;
  const packageJson = {
    exports: {
      [subpath]: generateExpectedPackageJsonSubpath(name, esm),
    },
  };

  if (name === 'index') {
    packageJson.types = './dist/index.d.ts';
    packageJson.main = './dist/index.js';
    if (esm) {
      // "index.esm.js" should be set as the "module" field for webpack 4 and other tools,
      // since they don't support the "exports" field.
      // We change the extension from ".mjs" to ".js" because ".mjs" doesn't work properly in webpack 4.
      // https://github.com/adobe/react-spectrum/pull/4038
      packageJson.module = './dist/index.esm.js';
    }
  } else if (name === 'react-server') {
    packageJson.exports['./react-server-conditional'] = {
      'react-server': generateExpectedPackageJsonSubpath('react-server', esm),
      default: generateExpectedPackageJsonSubpath('index', esm),
    };
  }

  return packageJson;
}

function generateExpectedPackageJsonSubpath(name, esm) {
  if (esm) {
    return {
      types: `./dist/${name}.d.ts`,
      import: `./dist/${name}.mjs`,
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
function validatePackageJson(actual, expected, path = '') {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const nestedPath =  path ? `${path} > "${key}"` : `"${key}"`;
    if (!(key in actual)) {
      throw new Error(`package.json ${nestedPath} field missing`);
    }

    if (typeof expectedValue === 'string') {
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

async function buildBundle({ entryPoint, name, formats, useClient, watch }) {
  return Promise.all(
    formats.map(async (format) => {
      const outfile = `dist/${name}.${format === 'cjs' ? 'js' : 'mjs'}`;
      const esbuildOptions = {
        bundle: true,
        packages: 'external', // don't bundle node_modules

        entryPoints: [entryPoint],
        format,
        target: 'es6',
        outfile,

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
        if (outfile === 'dist/index.mjs') {
          await fs.copyFile('dist/index.mjs', 'dist/index.esm.js');
          console.info(
            `built ${format.toUpperCase()} bundle at "dist/index.esm.js"`
          );
        }
      }
    })
  );
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
