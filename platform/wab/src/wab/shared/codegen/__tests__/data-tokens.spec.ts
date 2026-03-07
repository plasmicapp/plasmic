import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundle } from "@/wab/shared/bundler";
import dataTokensPageMetaBundle from "@/wab/shared/codegen/__tests__/bundles/data-tokens-page-meta.json";
import dataTokensBundle from "@/wab/shared/codegen/__tests__/bundles/data-tokens.json";
import {
  codegen,
  collectSnapshotForDir,
} from "@/wab/shared/codegen/codegen-tests-util";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import "core-js";
import tmp from "tmp";

describe("data tokens: codegen", () => {
  let dir: tmp.DirResult;

  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });
  afterEach(() => {
    dir.removeCallback();
  });

  it("should codegen correct contents with data tokens", async () => {
    const site = generateSiteFromBundle(dataTokensBundle as [string, Bundle][]);
    await codegen(dir.name, site, {
      platform: "react",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });

    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).toMatchSnapshot();
  });

  it("should codegen correct app dir contents with data tokens in metadata", async () => {
    const site = generateSiteFromBundle(
      dataTokensPageMetaBundle as [string, Bundle][]
    );
    await codegen(dir.name, site, {
      platform: "nextjs",
      codegenScheme: "blackbox",
      stylesScheme: "css",
      platformOptions: { nextjs: { appDir: true } },
      projectId: "3UYiEMfU3twU4iYSx86cub" as ProjectId,
    });

    const expectedSnapshot = collectSnapshotForDir(dir.name);
    expect(expectedSnapshot).toMatchSnapshot();
  });
});
