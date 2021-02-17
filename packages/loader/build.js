#!/usr/bin/env node

const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const packageJson = require("./package.json");

cp.execSync("npx tsc");
fs.copyFileSync(
  path.join("src", "gatsby", "package.json"),
  path.join("dist", "gatsby", "package.json")
);

fs.mkdirSync(path.join("dist", "templates"), { recursive: true });

fs.copyFileSync(
  path.join("src", "templates", "PlasmicLoader.dot"),
  path.join("dist", "templates", "PlasmicLoader.dot")
);

fs.copyFileSync(
  path.join("src", "templates", "PlasmicPage.dot"),
  path.join("dist", "templates", "PlasmicPage.dot")
);

delete packageJson.private;
delete packageJson.scripts;

packageJson.main = "PlasmicLoader.jsx";
packageJson.types = "PlasmicLoader.d.ts";

fs.writeFileSync(
  path.join("dist", "package.json"),
  JSON.stringify(packageJson, null, 2)
);

fs.copyFileSync("README.md", path.join("dist", "README.md"));
