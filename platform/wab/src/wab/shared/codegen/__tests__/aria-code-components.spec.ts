import { Bundle } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/aria-code-components.json";
import {
  codegen,
  collectSnapshotForDir,
} from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import "core-js";
import tmp from "tmp";

// This test is used to test codegen for Plasmic projects using code components with different metadata settings.
// currently the metadata settings we test are:
// - styleSections: false in root (via DataFetcher Parent component)
// - styleSections: false in nested root (via DataFetcher Grand Parent component)
// - styleSections: true in root (via wrapper Plasmic components for react-aria hostless package)
describe("aria code components example: codegen", () => {
  let dir: tmp.DirResult;
  const site: Site = generateSiteFromBundle(_bundle as [string, Bundle][]);

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
    // Expect the full contents to match a snapshot or specific string
    expect(expectedSnapshot).toMatchSnapshot();
  });

  it("should codegen correct contents - css modules", async () => {
    await codegen(dir.name, site, {
      platform: "react",
      codegenScheme: "blackbox",
      stylesScheme: "css-modules",
    });

    const expectedSnapshot = collectSnapshotForDir(dir.name);
    // Expect the full contents to match a snapshot or specific string
    expect(expectedSnapshot).toMatchSnapshot();
  });
});
