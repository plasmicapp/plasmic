/// <reference types="@types/jest" />
import path from "path";
import * as next from "./codebases/next";
import * as utils from "./codebases/utils";

describe("Next", () => {
  let dir: utils.TmpDir;
  beforeEach(() => (dir = utils.getTempDir()));
  afterEach(() => dir.removeCallback());
  it("Builds a codebase with the CLI", async () => {
    const appDir = path.join(dir.name, "myapp");
    const authPath = path.join(dir.name, ".plasmic.auth");
    console.log("Codegen output dir", dir.name);

    await next.initApp(dir.name);

    await next.copyPage(appDir);
    await Promise.all([utils.copyCredentials(authPath), next.copyPage(appDir)]);

    await utils.syncProject(appDir, authPath);
    await utils.buildProject(appDir);
  });
});
