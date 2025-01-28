import { Bundle, Bundler } from "@/wab/shared/bundler";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "@testing-library/jest-dom/extend-expect";
import "core-js";
import fs from "fs";
import path from "path";
import tmp from "tmp";
// Exported from https://studio.plasmic.app/projects/a76RKRQpJHMAbDDNBWmUVs
import _bundle from "@/wab/shared/codegen/__tests__/bundles/aria-code-components.json";

describe("aria code components example: codegen", () => {
  const bundler = new Bundler();
  let site: Site;
  let dir: tmp.DirResult;

  for (const bundle of _bundle as [string, Bundle][]) {
    site = bundler.unbundle(bundle[1], bundle[0]) as Site;
  }

  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });
  afterEach(() => {
    dir.removeCallback();
  });

  it("should codegen correct contents", async () => {
    await codegen(dir.name, site);

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
