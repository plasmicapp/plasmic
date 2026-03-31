import { Bundle } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/imported-project-default-theme-styles.json";
import {
  codegen,
  collectSnapshotForDir,
} from "@/wab/shared/codegen/codegen-tests-util";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import "core-js";
import tmp from "tmp";

describe("imported project default theme styles: codegen", () => {
  let dir: tmp.DirResult;
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });
  afterEach(() => {
    dir.removeCallback();
  });

  it("should codegen correct contents - css", async () => {
    await codegen(dir.name, site, {
      platform: "react",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });

    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).toMatchSnapshot();
  });

  it("should codegen correct contents - css modules", async () => {
    await codegen(dir.name, site, {
      platform: "react",
      codegenScheme: "blackbox",
      stylesScheme: "css-modules",
    });

    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).toMatchSnapshot();
  });
});
