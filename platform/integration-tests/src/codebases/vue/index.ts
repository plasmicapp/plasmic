import { promises as fs } from "fs";
import path from "path";
import * as utils from "../utils";

const PROJECT_NAME = "myapp";

export function initApp(dir: string) {
  return utils.runCommand(
    `npx @vue/cli create --preset default ${PROJECT_NAME}`,
    {
      dir,
    }
  );
}

export async function installLoader(dir: string) {
  const projectDir = path.join(dir, PROJECT_NAME);
  await utils.runCommand("npm install @plasmicapp/loader-vue", {
    dir: projectDir,
  });
  await utils.runCommand("npm install @vue/composition-api", {
    dir: projectDir,
  });
  await utils.runCommand("npm install vue-router", { dir: projectDir });
}

export async function updateFiles(dir: string) {
  const projectDir = path.join(dir, PROJECT_NAME);
  const srcDir = path.join(projectDir, "src");
  await fs.copyFile(
    path.join(__dirname, "app.template.vue"),
    path.join(srcDir, "App.vue")
  );
  await fs.copyFile(
    path.join(__dirname, "catch-all.template.js"),
    path.join(srcDir, "CatchAll.js")
  );
  await fs.copyFile(
    path.join(__dirname, "main.template.js"),
    path.join(srcDir, "main.js")
  );
  await fs.copyFile(
    path.join(__dirname, "plasmic-init.template.js"),
    path.join(srcDir, "plasmic-init.js")
  );
}

export function buildApp(dir: string) {
  const projectDir = path.join(dir, PROJECT_NAME);
  return utils.runCommand("npm run build", { dir: projectDir });
}
