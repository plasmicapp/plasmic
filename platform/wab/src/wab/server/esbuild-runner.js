// Based a bit on https://github.com/folke/esbuild-runner/blob/main/src/cli.ts

require("esbuild-register");
const path = require("path");
const Module = require("module");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const [node, self, first, ...rest] = process.argv;
process.argv = [node, first, ...rest];

process.argv[1] = path.resolve(process.argv[1]);

console.log(process.argv);

Module.runMain();
