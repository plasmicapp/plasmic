import {
  _testonly,
  extractBundleKeyProjectIds,
  LATEST_LOADER_VERSION,
  LOADER_CODEGEN_OPTS_DEFAULTS,
} from "@/wab/server/loader/gen-code-bundle";

const BASE_OPTS = {
  platformOptions: {},
  i18nTagPrefix: undefined,
} as const;

describe("makeExportOpts", () => {
  it("defaults platform to react when not specified", () => {
    const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 1 });
    expect(opts.platform).toBe("react");
  });

  it("gates useCodeComponentHelpersRegistry on loaderVersion", () => {
    const v9 = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 9 });
    expect(v9.useCodeComponentHelpersRegistry).toBe(false);

    const v10 = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 10 });
    expect(v10.useCodeComponentHelpersRegistry).toBe(true);
  });

  it("always enables the substitution apis", () => {
    for (const loaderVersion of [1, LATEST_LOADER_VERSION]) {
      const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion });
      expect(opts.useComponentSubstitutionApi).toBe(true);
      expect(opts.useGlobalVariantsSubstitutionApi).toBe(true);
    }
  });

  it("includes localization when i18nKeyScheme is provided", () => {
    const opts = _testonly.makeExportOpts({
      ...BASE_OPTS,
      loaderVersion: 1,
      i18nKeyScheme: "hash",
      i18nTagPrefix: "x-",
    });
    expect(opts.localization).toEqual({ keyScheme: "hash", tagPrefix: "x-" });
  });

  it("omits localization when i18nKeyScheme is not provided", () => {
    const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 1 });
    expect(opts.localization).toBeUndefined();
  });

  it("only overrides the defaults it is documented to override", () => {
    const opts = _testonly.makeExportOpts({
      ...BASE_OPTS,
      loaderVersion: LATEST_LOADER_VERSION,
    });
    expect(opts).toEqual({
      ...LOADER_CODEGEN_OPTS_DEFAULTS,
      platformOptions: {},
      useComponentSubstitutionApi: true,
      useGlobalVariantsSubstitutionApi: true,
      useCodeComponentHelpersRegistry: true,
      skipHead: undefined,
    });
  });
});

describe("makeBundleBucketPath/extractBundleKeyProjectIds", () => {
  it("should work", () => {
    const bundleKey = _testonly.makeBundleBucketPath({
      projectVersions: {
        p1: { version: "10.0.0", indirect: false },
        p2: { version: "1.2.3", indirect: false },
        p3: { version: "0.0.1", indirect: true },
      },
      platform: "react",
      loaderVersion: 7,
      browserOnly: true,
      exportOpts: LOADER_CODEGEN_OPTS_DEFAULTS,
    });
    expect(bundleKey).toEqual(
      "bundle/cb=22/loaderVersion=7/ps=p1@10.0.0,p2@1.2.3/platform=react/browserOnly=true/opts=22a86211efc9ac67440fb332014652a6010e993f48c3068b936afe2128f03e3c"
    );
    expect(extractBundleKeyProjectIds(bundleKey)).toEqual(["p1", "p2"]);
  });
});
