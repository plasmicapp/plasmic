import { promises as fs } from "fs";
import path from "path";
import * as utils from "../utils";

export function initApp(dir: string) {
  return utils.runCommand(
    `npm init next-app -- myapp --js --eslint --no-app --no-src-dir --no-tailwind --import-alias=@/* myapp`,
    {
      dir,
    }
  );
}

export function copyConfig(dir: string) {
  return fs.copyFile(
    path.join(__dirname, "next.config.template.js"),
    path.join(dir, "next.config.js")
  );
}

export function copyPlasmicLoaderPage(dir: string) {
  return fs.copyFile(
    path.join(__dirname, "page-with-loader.template.js"),
    path.join(dir, "pages", "index.js")
  );
}

export function copyPage(dir: string) {
  return fs.copyFile(
    path.join(__dirname, "page.template.js"),
    path.join(dir, "pages", "index.js")
  );
}
