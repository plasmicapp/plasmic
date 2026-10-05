import { Bundler } from "@/wab/shared/bundler";
import { AssertionError, jsonClone } from "@/wab/shared/common";
import { Site, ensureKnownSite } from "@/wab/shared/model/classes";
import {
  fetchLastBundleVersion,
  lastBundleVersion,
  singleComponentSite,
} from "@/wab/shared/site-diffs/__testonly__/utils";
import { tryMerge } from "@/wab/shared/site-diffs/merge-core";

beforeAll(async () => {
  await fetchLastBundleVersion();
});

function mergeInputs(site: Site) {
  const bundle = new Bundler().bundle(site, "source", lastBundleVersion);
  const bundler = new Bundler();
  const [ancestor, a, b, merged] = ["ancestor", "a", "b", "merged"].map(
    (uuid) => ensureKnownSite(bundler.unbundle(jsonClone(bundle), uuid)),
  );
  return { bundler, ancestor, a, b, merged };
}

describe("tryMerge entry assertion", () => {
  const merge = (inputs: ReturnType<typeof mergeInputs>) =>
    tryMerge(
      inputs.ancestor,
      inputs.a,
      inputs.b,
      inputs.merged,
      inputs.bundler,
      undefined,
    );

  it("lets through a merged site that equals the ancestor", () => {
    expect(merge(mergeInputs(singleComponentSite())).status).toBe("merged");
  });

  it("throws an AssertionError when the merged site differs from the ancestor", () => {
    const inputs = mergeInputs(singleComponentSite());
    inputs.merged.userManagedFonts.push("Changed");
    expect(() => merge(inputs)).toThrow(AssertionError);
    expect(() => merge(inputs)).toThrow(
      "Initial merged site must be identical to ancestor site",
    );
  });

  it("throws a TypeError when an object in the site owns a __wrapped__ key", () => {
    const site = singleComponentSite();
    site.components[0].metadata = { __wrapped__: "x" };
    const inputs = mergeInputs(site);
    expect(() => merge(inputs)).toThrow(TypeError);
  });
});
