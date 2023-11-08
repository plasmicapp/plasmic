import { promises as fs } from "fs";
import path from "path";
import * as utils from "../utils";

export function initApp(dir: string) {
  return utils.runCommand(
    "git clone https://github.com/gatsbyjs/gatsby-starter-minimal.git myapp --recursive --depth 1 --quiet",
    {
      dir,
    }
  );
}

export function copyConfig(dir: string) {
  return fs.copyFile(
    path.join(__dirname, "gatsby-config.template.js"),
    path.join(dir, "gatsby-config.js")
  );
}

export function copyPage(dir: string) {
  return fs.copyFile(
    path.join(__dirname, "page.template.js"),
    path.join(dir, "src", "pages", "index.js")
  );
}

export function copyPlasmicLoaderPage(dir: string) {
  return fs.copyFile(
    path.join(__dirname, "page-with-loader.template.js"),
    path.join(dir, "src", "pages", "index.js")
  );
}
