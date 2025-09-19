import { Bundle, Bundler } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/aria-code-components.json";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import {
  Site,
  isKnownProjectDependency,
  isKnownSite,
} from "@/wab/shared/model/classes";
import "core-js";
import fs from "fs";
import path from "path";
import tmp from "tmp";

// This test is used to test codegen for Plasmic projects using code components with different metadata settings.
// currently the metadata settings we test are:
// - styleSections: false in root (via DataFetcher Parent component)
// - styleSections: false in nested root (via DataFetcher Grand Parent component)
// - styleSections: true in root (via wrapper Plasmic components for react-aria hostless package)
describe("aria code components example: codegen", () => {
  const bundler = new Bundler();
  let site: Site;
  let dir: tmp.DirResult;

  for (const bundle of _bundle as [string, Bundle][]) {
    const unbundled = bundler.unbundle(bundle[1], bundle[0]);
    if (isKnownSite(unbundled)) {
      site = unbundled;
    } else if (isKnownProjectDependency(unbundled)) {
      site = unbundled.site;
    }
  }

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

    const files = fs.readdirSync(dir.name);
    let allFileContents = "";
    // Append the contents of each file to a string
    for (const file of files) {
      const filePath = path.join(dir.name, file);
      if (fs.statSync(filePath).isFile()) {
        const fileContents = fs.readFileSync(filePath, "utf8");
        allFileContents += `\n--- ${file} ---\n${fileContents}`;
      }
    }
    // Expect the full contents to match a snapshot or specific string
    expect(allFileContents).toMatchSnapshot();
  }, 300000);

  it("should codegen correct contents - css modules", async () => {
    await codegen(dir.name, site, {
      platform: "react",
      codegenScheme: "blackbox",
      stylesScheme: "css-modules",
    });

    const files = fs.readdirSync(dir.name);
    let allFileContents = "";
    // Append the contents of each file to a string
    for (const file of files) {
      const filePath = path.join(dir.name, file);
      if (fs.statSync(filePath).isFile()) {
        const fileContents = fs.readFileSync(filePath, "utf8");
        allFileContents += `\n--- ${file} ---\n${fileContents}`;
      }
    }
    // Expect the full contents to match a snapshot or specific string
    expect(allFileContents).toMatchSnapshot();
  }, 300000);
});
