import path from "path";
import * as utils from "./codebases/utils";

const PLASMIC_PROJECT_ID = "YeV7hBtta1Q9hvodwJjB6";
const PLASMIC_PROJECT_API_TOKEN =
  "Klj3JVWzgAtYev9XJii7weh8BaeFzq1aK6zNyPfYQv3zy4hBCP2TQfJoQED25xXm3Clat8Wc3Rbe7Lg0cCA";
const PROJECT_NAME = "my-app";

/*
 * The tests in this suite can sometimes take a lot of time, but they may also fall back
 * to interactive mode. The timeout is set to catch these interactive cases sooner.
 */
const TESTS_TIMEOUT_IN_MS = 7 * 60 * 1000; // 7 minutes.

interface TestCase {
  platform: "nextjs" | "gatsby" | "react" | "tanstack";
  scheme: "codegen" | "loader";
  ts: boolean;
  appDir?: boolean;
}

function caseName(c: TestCase): string {
  const lang = c.ts ? "typescript" : "javascript";
  let router = "";
  if (c.appDir !== undefined) {
    router = c.appDir ? " app router" : " pages router";
  }
  return `${c.platform} ${c.scheme} ${lang}${router}`;
}

function buildCommand(c: TestCase): string {
  const flags = [
    `--typescript=${c.ts}`,
    `--platform=${c.platform}`,
    `--scheme=${c.scheme}`,
    ...(c.appDir !== undefined ? [`--appDir=${c.appDir}`] : []),
    `--projectId=${PLASMIC_PROJECT_ID}`,
    `--projectApiToken=${PLASMIC_PROJECT_API_TOKEN}`,
  ];
  return `npx create-plasmic-app@latest ${PROJECT_NAME} ${flags.join(" ")}`;
}

const cases = (
  [
    { platform: "nextjs", scheme: "codegen", ts: false, appDir: false },
    { platform: "nextjs", scheme: "codegen", ts: false, appDir: true },
    { platform: "nextjs", scheme: "codegen", ts: true, appDir: false },
    { platform: "nextjs", scheme: "codegen", ts: true, appDir: true },
    { platform: "nextjs", scheme: "loader", ts: false, appDir: false },
    { platform: "nextjs", scheme: "loader", ts: false, appDir: true },
    { platform: "nextjs", scheme: "loader", ts: true, appDir: false },
    { platform: "nextjs", scheme: "loader", ts: true, appDir: true },
    { platform: "gatsby", scheme: "codegen", ts: false },
    { platform: "gatsby", scheme: "codegen", ts: true },
    { platform: "gatsby", scheme: "loader", ts: false },
    { platform: "gatsby", scheme: "loader", ts: true },
    { platform: "react", scheme: "codegen", ts: false },
    { platform: "react", scheme: "codegen", ts: true },
    { platform: "tanstack", scheme: "codegen", ts: true },
  ] as TestCase[]
).map((c) => ({ ...c, name: caseName(c) }));

describe("create-plasmic-app", () => {
  let dir: utils.TmpDir;
  beforeEach(() => (dir = utils.getTempDir()));
  afterEach(() => dir.removeCallback());

  it.each(cases)(
    "$name",
    async (c) => {
      const appDir = path.join(dir.name, PROJECT_NAME);
      console.log("Output dir", appDir);
      await utils.runCommand(buildCommand(c), { dir: dir.name });
      await utils.runCommand(`npm run build`, { dir: appDir });
    },
    TESTS_TIMEOUT_IN_MS
  );
});
