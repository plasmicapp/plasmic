import path from "path";
import * as gatsby from "./codebases/gatsby";
import * as utils from "./codebases/utils";

describe("Gatsby", () => {
  let dir: utils.TmpDir;
  beforeEach(() => (dir = utils.getTempDir()));
  afterEach(() => dir.removeCallback());
  it("Builds a codebase with the CLI", async () => {
    const appDir = path.join(dir.name, "myapp");
    const authPath = path.join(dir.name, ".plasmic.auth");
    console.log("Codegen output dir", dir.name);

    await gatsby.initApp(dir.name);

    await Promise.all([
      utils.copyCredentials(authPath),
      gatsby.copyPage(appDir),
    ]);

    await utils.syncProject(appDir, authPath);
    await utils.buildProject(appDir);
  });
});
