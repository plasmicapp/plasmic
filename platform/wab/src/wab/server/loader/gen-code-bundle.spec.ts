import {
  _testonly,
  extractBundleKeyProjectIds,
  LOADER_CODEGEN_OPTS_DEFAULTS,
} from "@/wab/server/loader/gen-code-bundle";

const BASE_OPTS = {
  platformOptions: {},
  i18nTagPrefix: undefined,
} as const;

describe("makeExportOpts", () => {
  it("defaults platform to react when not specified", () => {
    const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 7 });
    expect(opts.platform).toBe("react");
  });

  it("always enables component and global variants substitution APIs", () => {
    const v7 = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 7 });
    expect(v7.useComponentSubstitutionApi).toBe(true);
    expect(v7.useGlobalVariantsSubstitutionApi).toBe(true);

    const v10 = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 10 });
    expect(v10.useComponentSubstitutionApi).toBe(true);
    expect(v10.useGlobalVariantsSubstitutionApi).toBe(true);
  });

  it("gates useCodeComponentHelpersRegistry on loaderVersion", () => {
    const v7 = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 7 });
    expect(v7.useCodeComponentHelpersRegistry).toBe(false);

    const v10 = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 10 });
    expect(v10.useCodeComponentHelpersRegistry).toBe(true);
  });

  it("includes localization when i18nKeyScheme is provided", () => {
    const opts = _testonly.makeExportOpts({
      ...BASE_OPTS,
      loaderVersion: 7,
      i18nKeyScheme: "hash",
      i18nTagPrefix: "x-",
    });
    expect(opts.localization).toEqual({ keyScheme: "hash", tagPrefix: "x-" });
  });

  it("omits localization when i18nKeyScheme is not provided", () => {
    const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 7 });
    expect(opts.localization).toBeUndefined();
  });

  it("produces a key consistent with LOADER_CODEGEN_OPTS_DEFAULTS for default inputs", () => {
    const opts = _testonly.makeExportOpts({ ...BASE_OPTS, loaderVersion: 7 });
    expect(opts).toMatchObject({
      ...LOADER_CODEGEN_OPTS_DEFAULTS,
      useComponentSubstitutionApi: true,
      useGlobalVariantsSubstitutionApi: true,
      useCodeComponentHelpersRegistry: false,
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
