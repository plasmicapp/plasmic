import { describe, expect, it } from "vitest";
import { InitArgs, createInitConfig } from "../actions/init";

const initArgs: Omit<InitArgs, "baseDir"> = {
  host: "https://studio.plasmic.app",
  platform: "react",
  codeLang: "ts",
  codeScheme: "blackbox",
  styleScheme: "css-modules",
  imagesScheme: "inlined",
  imagesPublicDir: "public",
  imagesPublicUrlPrefix: "/",
  srcDir: "src",
  plasmicDir: "plasmic",
};

describe("createInitConfig", () => {
  it.each(["npm", "yarn", "yarn2", "pnpm"] as const)(
    "records an explicitly requested %s package manager",
    (packageManager) => {
      expect(
        createInitConfig({ ...initArgs, packageManager }).packageManager
      ).toBe(packageManager);
    }
  );

  it("leaves the package manager unset when none was requested", () => {
    expect(createInitConfig(initArgs).packageManager).toBeUndefined();
  });
});
