/* eslint-disable no-restricted-properties */
/* eslint-disable no-restricted-syntax */
import fs from "fs";
import os from "os";
import path from "path";
import { detectNextJsAppDir, detectNextJsVersion } from "../utils/envdetect";

describe("detectNextJsAppDir", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "envdetect-test-"));
    console.log("Added temp dir at ", tempDir);
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns false when not a Next.js project", () => {
    // Empty directory, no next.config.js
    expect(detectNextJsAppDir()).toBe(false);
  });

  it("returns true with experimental appDir flag", () => {
    fs.writeFileSync(
      path.join(tempDir, "next.config.js"),
      "module.exports = { experimental: { appDir: true } };"
    );
    fs.mkdirSync(path.join(tempDir, "app"));
    fs.writeFileSync(path.join(tempDir, "app/page.tsx"), "");

    expect(detectNextJsAppDir()).toBe(true);
  });

  it("returns false with pages router only", () => {
    fs.writeFileSync(
      path.join(tempDir, "next.config.js"),
      "module.exports = {};"
    );
    fs.mkdirSync(path.join(tempDir, "pages"));
    fs.writeFileSync(path.join(tempDir, "pages/index.tsx"), "");

    expect(detectNextJsAppDir()).toBe(false);
  });

  it("returns false with pages router only", () => {
    fs.writeFileSync(
      path.join(tempDir, "next.config.js"),
      "module.exports = {};"
    );
    fs.mkdirSync(path.join(tempDir, "pages"));
    fs.writeFileSync(path.join(tempDir, "pages/index.tsx"), "");

    expect(detectNextJsAppDir()).toBe(false);
  });

  it("returns true with app router only", () => {
    fs.writeFileSync(
      path.join(tempDir, "next.config.js"),
      "module.exports = {};"
    );
    fs.mkdirSync(path.join(tempDir, "app"));
    fs.writeFileSync(path.join(tempDir, "app/page.tsx"), "");

    expect(detectNextJsAppDir()).toBe(true);
  });

  describe("app + pages router", () => {
    function setupHybridRouterDir(nextVersion: string) {
      fs.writeFileSync(
        path.join(tempDir, "next.config.js"),
        "module.exports = {};"
      );

      // Create package.json with Next.js version
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify({
          dependencies: { next: nextVersion },
        })
      );

      // Create both app and pages directories
      fs.mkdirSync(path.join(tempDir, "app"));
      fs.writeFileSync(path.join(tempDir, "app/page.tsx"), "");
      fs.mkdirSync(path.join(tempDir, "pages"));
      fs.writeFileSync(path.join(tempDir, "pages/index.tsx"), "");
    }

    it("returns true when Next.js > 13.4.0 with hybrid routing", () => {
      setupHybridRouterDir("^14.0.0");
      expect(detectNextJsAppDir()).toBe(true);
    });

    it("returns false when Next.js < 13.4.0 with hybrid routing", () => {
      setupHybridRouterDir("^12.0.0");
      expect(detectNextJsAppDir()).toBe(false);
    });

    it("returns true when Next.js === 13.4.0 with hybrid routing", () => {
      setupHybridRouterDir("13.4.0");
      expect(detectNextJsAppDir()).toBe(true);
    });

    it("should handle prerelease versions like 14.0.0-canary.1", () => {
      setupHybridRouterDir("14.0.0-canary.1");
      expect(detectNextJsAppDir()).toBe(true);
    });
  });
});

describe("detectNextJsVersion", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "envdetect-test-"));
    console.log("Added temp dir at ", tempDir);
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writePackageJson(deps: Record<string, string>) {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: deps })
    );
  }

  it("returns undefined when no package.json exists", () => {
    expect(detectNextJsVersion()).toBeUndefined();
  });

  it("returns undefined when next is not a dependency", () => {
    writePackageJson({ react: "^18.0.0" });
    expect(detectNextJsVersion()).toBeUndefined();
  });

  it("returns major version from exact version", () => {
    writePackageJson({ next: "14.2.3" });
    expect(detectNextJsVersion()).toBe("14");
  });

  it("returns major version from caret range", () => {
    writePackageJson({ next: "^13.4.0" });
    expect(detectNextJsVersion()).toBe("13");
  });

  it("returns major version from tilde range", () => {
    writePackageJson({ next: "~12.1.0" });
    expect(detectNextJsVersion()).toBe("12");
  });

  it("returns major version from prerelease", () => {
    writePackageJson({ next: "15.0.0-canary.1" });
    expect(detectNextJsVersion()).toBe("15");
  });
});
