import { Bundle } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/links.json";
import {
  codegen,
  collectSnapshotForDir,
  generateSiteFromBundle,
} from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "core-js";
import tmp from "tmp";

// This test can be used to test codegen for miscellaneous things. Currently it tests
// Link component (legacy/modern behavior) only
describe("codegen for Link component (legacy/modern behavior)", () => {
  let dir: tmp.DirResult;
  const site: Site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });
  afterEach(() => {
    dir.removeCallback();
  });

  it("should codegen correct contents for legacy Next.js < 13", async () => {
    await codegen(dir.name, site, {
      platform: "nextjs",
      platformVersion: "12.3.4",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });

    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).not.toContain("legacyBehavior");
  });

  it("should codegen correct contents for Next.js 13.0.0", async () => {
    await codegen(dir.name, site, {
      platform: "nextjs",
      platformVersion: "13.0.0",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });

    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).toContain("legacyBehavior={false}");
  });

  it("should codegen correct contents for Next.js >= 13", async () => {
    await codegen(dir.name, site, {
      platform: "nextjs",
      platformVersion: "^14",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });
    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).toContain("legacyBehavior={false}");
  });

  it("should codegen correct contents for Next.js latest", async () => {
    await codegen(dir.name, site, {
      platform: "nextjs",
      platformVersion: "latest",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });
    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).toContain("legacyBehavior={false}");
  });

  it("should codegen correct contents for React", async () => {
    await codegen(dir.name, site, {
      platform: "react",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });
    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).not.toContain("legacyBehavior");
  });
});
