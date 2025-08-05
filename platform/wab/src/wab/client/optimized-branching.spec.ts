import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { mkTokenRef } from "@/wab/commons/StyleToken";
import { Bundler } from "@/wab/shared/bundler";
import { arrayRemove } from "@/wab/shared/collections";
import { ensure, jsonClone, mkUuid } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { createSite, writeable } from "@/wab/shared/core/sites";
import { flattenTpls, isTplNamable, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  isKnownTplSlot,
  Site,
  TplSlot,
  TplTag,
  VariantedValue,
} from "@/wab/shared/model/classes";
import {
  applyTestMerge,
  basicSite,
  fetchLastBundleVersion,
  lastBundleVersion,
  testMerge,
  TestResult,
} from "@/wab/shared/site-diffs/_tests_/utils";
import { inferUpdatedComponents } from "@/wab/shared/site-diffs/merge-components";
import { BranchSide } from "@/wab/shared/site-diffs/merge-core";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBaseVariant, mkVariantSetting } from "@/wab/shared/Variants";

beforeAll(async () => {
  await fetchLastBundleVersion();
});

async function observedTestMerge({
  ancestorSite = createSite(),
  a = () => {},
  b = () => {},
  directConflictsPicks,
}: {
  ancestorSite: Site | (() => Site);
  a: (site: Site, tplMgr: TplMgr) => void;
  b: (site: Site, tplMgr: TplMgr) => void;
  directConflictsPicks?: BranchSide[];
  useLegacyResolveConflicts?: boolean;
}): Promise<TestResult> {
  const ancestorUuid = mkUuid();
  const bundler = new Bundler();

  const bundle = bundler.bundle(
    typeof ancestorSite === "function" ? ancestorSite() : ancestorSite,
    ancestorUuid,
    lastBundleVersion
  );

  const aUuid = mkUuid();
  const draftASite = bundler.unbundle(jsonClone(bundle), aUuid) as Site;
  const { studioCtx: studioCtxA } = fakeStudioCtx({ site: draftASite });
  await studioCtxA.changeObserved(
    () => draftASite.components,
    ({ success }) => {
      a(draftASite, new TplMgr({ site: draftASite }));
      return success();
    }
  );
  studioCtxA.dispose();

  const bUuid = mkUuid();
  const draftBSite = bundler.unbundle(jsonClone(bundle), bUuid) as Site;
  const { studioCtx: studioCtxB } = fakeStudioCtx({ site: draftBSite });
  await studioCtxB.changeObserved(
    () => draftBSite.components,
    ({ success }) => {
      b(draftBSite, new TplMgr({ site: draftBSite }));
      return success();
    }
  );
  studioCtxB.dispose();

  const finalABundle = bundler.bundle(draftASite, aUuid, lastBundleVersion);
  const finalBBundle = bundler.bundle(draftBSite, bUuid, lastBundleVersion);

  return applyTestMerge({
    ancestorBundle: bundle,
    ancestorUuid,
    aBundle: finalABundle,
    aUuid,
    bBundle: finalBBundle,
    bUuid,
    directConflictsPicks,
  });
}

describe("Optimized merging with updatedAt", () => {
  describe("inferUpdatedComponents", () => {
    it("will return components that were updated", () => {
      const ancestorSite = createSite();
      const leftSite = createSite();
      const rightSite = createSite();

      function mkComponentWithUpdatedAt(
        uuid: string,
        updatedAt: number | undefined | null
      ) {
        const comp = mkComponent({
          name: "component",
          type: ComponentType.Plain,
          tplTree: mkTplTagX("div", {
            name: "component",
          }),
        });
        writeable(comp).uuid = uuid;
        writeable(comp).updatedAt = updatedAt;
        return comp;
      }

      ancestorSite.components.push(mkComponentWithUpdatedAt("c1", null));
      leftSite.components.push(mkComponentWithUpdatedAt("c1", null));
      rightSite.components.push(mkComponentWithUpdatedAt("c1", null));

      ancestorSite.components.push(mkComponentWithUpdatedAt("c2", null));
      leftSite.components.push(mkComponentWithUpdatedAt("c2", 1));
      rightSite.components.push(mkComponentWithUpdatedAt("c2", 2));

      ancestorSite.components.push(mkComponentWithUpdatedAt("c3", 1));
      leftSite.components.push(mkComponentWithUpdatedAt("c3", 1));
      rightSite.components.push(mkComponentWithUpdatedAt("c3", 2));

      ancestorSite.components.push(mkComponentWithUpdatedAt("c4", 1));
      leftSite.components.push(mkComponentWithUpdatedAt("c4", 2));
      rightSite.components.push(mkComponentWithUpdatedAt("c4", 1));

      ancestorSite.components.push(mkComponentWithUpdatedAt("c5", 1));
      leftSite.components.push(mkComponentWithUpdatedAt("c5", 2));
      rightSite.components.push(mkComponentWithUpdatedAt("c5", 2));

      ancestorSite.components.push(mkComponentWithUpdatedAt("c6", 2));
      leftSite.components.push(mkComponentWithUpdatedAt("c6", 2));
      rightSite.components.push(mkComponentWithUpdatedAt("c6", 2));

      const updatedComponents = inferUpdatedComponents(
        ancestorSite,
        leftSite,
        rightSite
      );
      // Only c6 is not updated because it's the same in all branches
      expect(updatedComponents).toEqual(
        new Set(["c1", "c2", "c3", "c4", "c5"])
      );
    });
  });
  // Some tests to ensure that missing updatedAt changes will lead to errors
  describe("non observed test merge", () => {
    // TODO:
    // - Refactor token operations to not depend on React
    // - Add site invariant for invalid token references in the tpl tree
    xit("won't update old references in the merged site", () => {
      let tokenRef: string;
      const result = testMerge({
        ancestorSite: () => {
          const site = basicSite();
          tokenRef = mkTokenRef(site.styleTokens[0]);
          (site.components[0].tplTree as TplTag).vsettings[0].rs.values[
            "line-height"
          ] = tokenRef;
          return site;
        },
        // Removing referenced token in the ancestor branch, normally this would trigger changes in the reference
        // but since it's not observed, it won't be considered updated
        a: (site) => {
          arrayRemove(site.styleTokens, site.styleTokens[0]);

          // Manually fixing the token reference, because token operations are in site ops, which are client side only
          // (e.g it triggers some modals for the user to confirm)
          (site.components[0].tplTree as TplTag).vsettings[0].rs.values[
            "line-height"
          ] = "1";
        },
        b: (site) => {
          site.styleTokens[1].value = mkTokenRef(site.styleTokens[0]);
          site.styleTokens[1].variantedValues.push(
            new VariantedValue({
              value: mkTokenRef(site.styleTokens[0]),
              variants: [site.globalVariantGroups[0].variants[0]],
            })
          );
        },
        changeUpdatedAt: false,
      });
      // The correct thing here should be for the merge to throw, but we are missing a site invariant for invalid token references
      // checking the value directly

      expect(
        result.mergedSite.components[0].tplTree.vsettings[0].rs.values[
          "line-height"
        ]
      ).toEqual(tokenRef!);
    });

    it("won't merge default slot contents and updates virtual slot arg", () => {
      const result = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          const comp = ensure(
            site.components.find((c) => c.name === "HasSlots"),
            () => "Couldn't find HasSlots"
          );
          let tplSlot: TplSlot = undefined as any;
          flattenTpls(comp.tplTree).forEach((tpl) => {
            if (isKnownTplSlot(tpl) && tpl.param.variable.name === "slot1") {
              tplSlot = tpl;
            }
          });
          const baseVariant = getBaseVariant(comp);
          $$$(ensure(tplSlot, () => `Couldn't find slot1`)).append(
            mkTplTagX("div", {
              name: "append",
              baseVariant,
              variants: [mkVariantSetting({ variants: [baseVariant] })],
            })
          );
        },
        b: (site) => {
          const comp = ensure(
            site.components.find((c) => c.name === "HasSlots"),
            () => "Couldn't find HasSlots"
          );
          let tplSlot: TplSlot = undefined as any;
          flattenTpls(comp.tplTree).forEach((tpl) => {
            if (isKnownTplSlot(tpl) && tpl.param.variable.name === "slot1") {
              tplSlot = tpl;
            }
          });
          const baseVariant = getBaseVariant(comp);
          $$$(ensure(tplSlot, () => `tplSlot is undefined`)).prepend(
            mkTplTagX("div", {
              name: "prepend",
              baseVariant,
              variants: [mkVariantSetting({ variants: [baseVariant] })],
            })
          );
        },
        changeUpdatedAt: false,
      });

      const comp = ensure(
        result.mergedSite.components.find((c) => c.name === "HasSlots"),
        () => "Couldn't find HasSlots"
      );
      const tplSlot = ensure(
        flattenTpls(comp.tplTree).find(
          (tpl): tpl is TplSlot =>
            isKnownTplSlot(tpl) && tpl.param.variable.name === "slot1"
        ),
        () => "Couldn't find slot1"
      );

      // Changes weren't applied since the updatedAt didn't change
      expect(
        tplSlot.defaultContents.map((c) => isTplNamable(c) && c.name)
      ).toEqual(["defaultContent"]);
    });
  });

  describe("observed test merge", () => {
    it("will handle removed tokens", async () => {
      let tokenRef: string;
      let initialUpdatedAt: number | null | undefined;
      const result = await observedTestMerge({
        ancestorSite: () => {
          const site = basicSite();
          tokenRef = mkTokenRef(site.styleTokens[0]);
          (site.components[0].tplTree as TplTag).vsettings[0].rs.values[
            "line-height"
          ] = tokenRef;
          initialUpdatedAt = site.components[0].updatedAt;
          return site;
        },
        // Removing referenced token in the ancestor branch, normally this would trigger changes in the reference
        // but since it's not observed, it won't be considered updated
        a: (site) => {
          arrayRemove(site.styleTokens, site.styleTokens[0]);
          (site.components[0].tplTree as TplTag).vsettings[0].rs.values[
            "line-height"
          ] = "1";
        },
        b: (site) => {
          site.styleTokens[1].value = mkTokenRef(site.styleTokens[0]);
          site.styleTokens[1].variantedValues.push(
            new VariantedValue({
              value: mkTokenRef(site.styleTokens[0]),
              variants: [site.globalVariantGroups[0].variants[0]],
            })
          );
        },
      });

      expect(
        result.mergedSite.components[0].tplTree.vsettings[0].rs.values[
          "line-height"
        ]
      ).toEqual("1");

      expect(result.mergedSite.components[0].updatedAt).not.toEqual(
        initialUpdatedAt
      );
    });

    it("merges default slot contents and updates virtual slot arg", async () => {
      const result = await observedTestMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          const comp = ensure(
            site.components.find((c) => c.name === "HasSlots"),
            () => "Couldn't find HasSlots"
          );
          let tplSlot: TplSlot = undefined as any;
          flattenTpls(comp.tplTree).forEach((tpl) => {
            if (isKnownTplSlot(tpl) && tpl.param.variable.name === "slot1") {
              tplSlot = tpl;
            }
          });
          const baseVariant = getBaseVariant(comp);
          $$$(ensure(tplSlot, () => `Couldn't find slot1`)).append(
            mkTplTagX("div", {
              name: "append",
              baseVariant,
              variants: [mkVariantSetting({ variants: [baseVariant] })],
            })
          );
        },
        b: (site) => {
          const comp = ensure(
            site.components.find((c) => c.name === "HasSlots"),
            () => "Couldn't find HasSlots"
          );
          let tplSlot: TplSlot = undefined as any;
          flattenTpls(comp.tplTree).forEach((tpl) => {
            if (isKnownTplSlot(tpl) && tpl.param.variable.name === "slot1") {
              tplSlot = tpl;
            }
          });
          const baseVariant = getBaseVariant(comp);
          $$$(ensure(tplSlot, () => `tplSlot is undefined`)).prepend(
            mkTplTagX("div", {
              name: "prepend",
              baseVariant,
              variants: [mkVariantSetting({ variants: [baseVariant] })],
            })
          );
        },
      });

      const comp = ensure(
        result.mergedSite.components.find((c) => c.name === "HasSlots"),
        () => "Couldn't find HasSlots"
      );
      const tplSlot = ensure(
        flattenTpls(comp.tplTree).find(
          (tpl): tpl is TplSlot =>
            isKnownTplSlot(tpl) && tpl.param.variable.name === "slot1"
        ),
        () => "Couldn't find slot1"
      );

      // Changes weren't applied since the updatedAt didn't change
      expect(
        tplSlot.defaultContents.map((c) => isTplNamable(c) && c.name)
      ).toEqual(["prepend", "defaultContent", "append"]);
    });
  });
});
