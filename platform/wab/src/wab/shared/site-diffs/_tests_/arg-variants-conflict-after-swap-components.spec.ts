import { ProjectFullDataResponse } from "@/wab/shared/ApiSchema";
import { assert, ensure, hackyCast } from "@/wab/shared/common";
import { findVariantGroupForParam } from "@/wab/shared/core/components";
import { flattenTpls, isTplComponent } from "@/wab/shared/core/tpls";
import {
  ensureKnownTplComponent,
  ensureKnownVariantsRef,
} from "@/wab/shared/model/classes";
import argVariantsWithConflicts from "@/wab/shared/site-diffs/_tests_/bundles/arg-variants-conflict-after-swap-components.json";
import {
  fetchLastBundleVersion,
  testMergeFromJsonBundle,
} from "@/wab/shared/site-diffs/_tests_/utils";

beforeAll(async () => {
  await fetchLastBundleVersion();
});

describe("VariantSettings arg variants with conflicts", () => {
  it("should merge without any errors", () => {
    /**
     * The content in both "main" and "branch-01" branches is same. Both branches imported a "TestComponent" from a project
     * "Parent". The "TestComponent" is now removed from the imported project and both branches updated the imported project,
     * which creates their respective "TestComponent" components in their branches.
     *
     * We are using "TestComponent" inside the Homepage in both branches. The tplTree and style configuration are exactly
     * the same for both branches. Both branches activated the "isActive" variant for "TestComponent" in Homepage.
     *
     * After merge we should expect the
     * - "TestComponent 2" to be created.
     * - "TestComponent 2" instance to be used in Homepage
     * - "isActive" variant to be activated for "TestComponent 2"
     */
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(argVariantsWithConflicts),
      { conflictPicks: ["right"] }
    );

    expect(result).toMatchObject({
      status: "merged",
    });

    const merged = result.mergedSite;

    const homePageComponent = ensure(
      merged.components.find((c) => c.name === "Homepage"),
      "Homepage component not found"
    );

    const testComponent2 = ensureKnownTplComponent(
      flattenTpls(homePageComponent.tplTree).find(
        (tpl) => isTplComponent(tpl) && tpl.component.name === "TestComponent 2"
      )
    );

    const arg = testComponent2.vsettings[0].args[0];
    const expr = ensureKnownVariantsRef(
      testComponent2.vsettings[0].args[0].expr
    );
    expect(expr.variants).toHaveLength(1);
    expect(expr.variants[0].name).toEqual("isActive");

    // Ensure all expr variants belong to component variant group
    const variantGroup = findVariantGroupForParam(
      testComponent2.component,
      arg.param
    );
    assert(variantGroup, "Variant group should exists");

    const variantsInVg = new Set(variantGroup.variants);
    expect(variantGroup.variants.some((v) => !variantsInVg.has(v))).toBe(false);
  });
});
