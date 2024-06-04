import path from "path";
import * as utils from "./codebases/utils";

const PLASMIC_PROJECT_ID = "YeV7hBtta1Q9hvodwJjB6";
const PLASMIC_PROJECT_API_TOKEN =
  "Klj3JVWzgAtYev9XJii7weh8BaeFzq1aK6zNyPfYQv3zy4hBCP2TQfJoQED25xXm3Clat8Wc3Rbe7Lg0cCA";
const PROJECT_NAME = "my-app";

/*
 * The tests in this suite can sometimes take a lot of time, but they may also fall back
 * to interactive mode. The timeout is catch these interactive cases sooner.
 */
const TESTS_TIMEOUT_IN_MS = 7 * 60 * 1000; // 7 minutes.

describe("create-plasmic-app", () => {
  let dir: utils.TmpDir;
  beforeEach(() => (dir = utils.getTempDir()));
  afterEach(() => dir.removeCallback());
  it(
    "nextjs codegen javascript",
    async () => {
      const appDir = path.join(dir.name, PROJECT_NAME);
      console.log("Codegen output dir", appDir);

      const command = `npx create-plasmic-app@latest ${PROJECT_NAME} --typescript false --platform=nextjs --scheme=codegen --appDir=no --projectId=${PLASMIC_PROJECT_ID} --projectApiToken=${PLASMIC_PROJECT_API_TOKEN}`;
      await utils.runCommand(command, { dir: dir.name });
      await utils.runCommand(`npm run build`, { dir: appDir });
    },
    TESTS_TIMEOUT_IN_MS
  );

  it(
    "nextjs codegen typescript",
    async () => {
      const appDir = path.join(dir.name, PROJECT_NAME);
      console.log("Codegen output dir", appDir);

      const command = `npx create-plasmic-app@latest ${PROJECT_NAME} --typescript --platform=nextjs --scheme=codegen --appDir=no --projectId=${PLASMIC_PROJECT_ID} --projectApiToken=${PLASMIC_PROJECT_API_TOKEN}`;
      await utils.runCommand(command, { dir: dir.name });
      await utils.runCommand(`npm run build`, { dir: appDir });
    },
    TESTS_TIMEOUT_IN_MS
  );

  it(
    "nextjs loader javascript",
    async () => {
      const appDir = path.join(dir.name, PROJECT_NAME);
      console.log("Codegen output dir", appDir);

      const command = `npx create-plasmic-app@latest ${PROJECT_NAME} --typescript false --platform=nextjs --scheme=loader --appDir=no --projectId=${PLASMIC_PROJECT_ID} --projectApiToken=${PLASMIC_PROJECT_API_TOKEN}`;
      await utils.runCommand(command, { dir: dir.name });
      await utils.runCommand(`npm run build`, { dir: appDir });
    },
    TESTS_TIMEOUT_IN_MS
  );

  it(
    "nextjs loader typescript",
    async () => {
      const appDir = path.join(dir.name, PROJECT_NAME);
      console.log("Codegen output dir", appDir);

      const command = `npx create-plasmic-app@latest ${PROJECT_NAME} --typescript --platform=nextjs --scheme=loader --appDir=no --projectId=${PLASMIC_PROJECT_ID} --projectApiToken=${PLASMIC_PROJECT_API_TOKEN}`;
      await utils.runCommand(command, { dir: dir.name });
      await utils.runCommand(`npm run build`, { dir: appDir });
    },
    TESTS_TIMEOUT_IN_MS
  );

  it(
    "react codegen javascript",
    async () => {
      const appDir = path.join(dir.name, PROJECT_NAME);
      console.log("Codegen output dir", appDir);

      const command = `npx create-plasmic-app@latest ${PROJECT_NAME} --typescript false --platform=react --scheme=codegen --projectId=${PLASMIC_PROJECT_ID} --projectApiToken=${PLASMIC_PROJECT_API_TOKEN}`;
      await utils.runCommand(command, { dir: dir.name });
      await utils.runCommand(`npm run build`, { dir: appDir });
    },
    TESTS_TIMEOUT_IN_MS
  );

  it(
    "react codegen typescript",
    async () => {
      const appDir = path.join(dir.name, PROJECT_NAME);
      console.log("Codegen output dir", appDir);

      const command = `npx create-plasmic-app@latest ${PROJECT_NAME} --typescript --platform=react --scheme=codegen --projectId=${PLASMIC_PROJECT_ID} --projectApiToken=${PLASMIC_PROJECT_API_TOKEN}`;
      await utils.runCommand(command, { dir: dir.name });
      await utils.runCommand(`npm run build`, { dir: appDir });
    },
    TESTS_TIMEOUT_IN_MS
  );
});
