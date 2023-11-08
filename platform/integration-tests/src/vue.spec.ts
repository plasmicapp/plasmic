/// <reference types="@types/jest" />
import * as utils from "./codebases/utils";
import * as vue from "./codebases/vue";

describe("Vue", () => {
  let dir: utils.TmpDir;
  beforeEach(() => (dir = utils.getTempDir()));
  afterEach(() => dir.removeCallback());
  it.skip("Builds a codebase with the loader", async () => {
    console.log("Project output dir", dir.name);
    await vue.initApp(dir.name);
    await vue.installLoader(dir.name);
    await vue.updateFiles(dir.name);
    await vue.buildApp(dir.name);
  });
});
