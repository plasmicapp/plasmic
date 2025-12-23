import { Bundle } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/data-tokens.json";
import {
  codegen,
  collectSnapshotForDir,
  generateSiteFromBundle,
} from "@/wab/shared/codegen/codegen-tests-util";
import "core-js";
import tmp from "tmp";

describe("data tokens: codegen", () => {
  let dir: tmp.DirResult;
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });
  afterEach(() => {
    dir.removeCallback();
  });

  it("should codegen correct contents with data tokens", async () => {
    await codegen(dir.name, site, {
      platform: "react",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });

    const expectedSnapshot = collectSnapshotForDir(dir.name);
    // Expect the full contents to match a snapshot or specific string
    expect(expectedSnapshot).toMatchSnapshot();
  });
});
