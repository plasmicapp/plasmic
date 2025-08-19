import {
  _testonly,
  extractBundleKeyProjectIds,
  LOADER_CODEGEN_OPTS_DEFAULTS,
} from "@/wab/server/loader/gen-code-bundle";

describe("makeBundleBucketPath/extractBundleKeyProjectIds", () => {
  it("should work", () => {
    const bundleKey = _testonly.makeBundleBucketPath({
      projectVersions: {
        p1: { version: "10.0.0", indirect: false },
        p2: { version: "1.2.3", indirect: false },
        p3: { version: "0.0.1", indirect: true },
      },
      platform: "react",
      loaderVersion: 1,
      browserOnly: true,
      exportOpts: LOADER_CODEGEN_OPTS_DEFAULTS,
    });
    expect(bundleKey).toEqual(
      "bundle/cb=20/loaderVersion=1/ps=p1@10.0.0,p2@1.2.3/platform=react/browserOnly=true/opts=22a86211efc9ac67440fb332014652a6010e993f48c3068b936afe2128f03e3c"
    );
    expect(extractBundleKeyProjectIds(bundleKey)).toEqual(["p1", "p2"]);
  });
});
