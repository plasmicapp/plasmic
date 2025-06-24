import { TokenType } from "@/wab/commons/StyleToken";
import { ProjectFullDataResponse } from "@/wab/shared/ApiSchema";
import { Bundle, Bundler, FastBundler } from "@/wab/shared/bundler";
import {
  assert,
  ensure,
  generate,
  jsonClone,
  mkUuid,
  strictZip,
  tuple,
} from "@/wab/shared/common";
import { addSlotParam, ComponentType } from "@/wab/shared/core/components";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { createSite } from "@/wab/shared/core/sites";
import { mkSlot, mkTplComponentX, mkTplTagX } from "@/wab/shared/core/tpls";
import { Pt } from "@/wab/shared/geom";
import {
  ensureKnownProjectDependency,
  ensureKnownSite,
  RenderExpr,
  Site,
} from "@/wab/shared/model/classes";
import {
  BranchSide,
  MergeDirectConflict,
  MergeStep,
  tryMerge,
} from "@/wab/shared/site-diffs/merge-core";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import { fillVirtualSlotContents } from "@/wab/shared/SlotUtils";
import { TplMgr, VariantOptionsType } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBaseVariant, mkVariantSetting } from "@/wab/shared/Variants";
import { range } from "lodash";
// eslint-disable-next-line
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { getLowestCommonAncestor } from "@/wab/shared/site-diffs/commit-graph";

export function upsertTokens(site: Site, tokens: Record<string, number>) {
  const tplMgr = new TplMgr({ site });
  return generate(function* () {
    for (const name of Object.keys(tokens)) {
      const found = site.styleTokens.find((t) => t.name === name);
      if (found) {
        found.value = "" + tokens[name];
        yield found;
      } else {
        yield tplMgr.addToken({
          name,
          tokenType: TokenType.LineHeight,
          value: (tokens[name] ?? 0) + "",
        });
      }
    }
  });
}

export function basicSite({
  tokens = { x: 1, y: 1 },
  globalVariants = { lightness: ["dark", "very dark", "night"] },
}: {
  tokens?: Record<string, number>;
  globalVariants?: Record<string, string[]>;
} = {}) {
  const site = createSite();
  upsertTokens(site, tokens);
  const tplMgr = new TplMgr({ site });

  tplMgr.createGlobalVariant(site.globalVariantGroups[0], "Mobile", {
    mediaQuery: "(min-width: 700px)",
  });
  for (const [name, vs] of Object.entries(globalVariants)) {
    const group = tplMgr.createGlobalVariantGroup(name);
    for (const vname of vs) {
      tplMgr.createGlobalVariant(group, vname);
    }
  }

  site.userManagedFonts.push("MyFont");

  tplMgr.addImageAsset({
    type: ImageAssetType.Picture,
  });
  tplMgr.addImageAsset({
    type: ImageAssetType.Picture,
  });
  tplMgr.addImageAsset({
    type: ImageAssetType.Picture,
  });

  tplMgr.addMixin("My mixin 1");
  tplMgr.addMixin("My mixin 2");
  tplMgr.addMixin("My mixin 3");

  const cmp = tplMgr.addComponent({
    name: "Button",
    type: ComponentType.Plain,
  });
  let tplTagA, tplTagB;
  const baseVariant = getBaseVariant(cmp);
  $$$(cmp.tplTree).append(
    (tplTagA = mkTplTagX("div", {
      name: "A",
      baseVariant,
      variants: [mkVariantSetting({ variants: [baseVariant] })],
    }))
  );
  $$$(cmp.tplTree).append(
    (tplTagB = mkTplTagX("div", {
      name: "B",
      baseVariant,
      variants: [mkVariantSetting({ variants: [baseVariant] })],
    }))
  );
  $$$(cmp.tplTree).append(
    mkTplTagX("div", {
      name: "C",
      baseVariant,
      variants: [mkVariantSetting({ variants: [baseVariant] })],
    })
  );
  $$$(cmp.tplTree).append(
    mkTplTagX("div", {
      name: "D",
      baseVariant,
      variants: [mkVariantSetting({ variants: [baseVariant] })],
    })
  );
  $$$(tplTagA).append(
    mkTplTagX("div", {
      name: "AA",
      baseVariant,
      variants: [mkVariantSetting({ variants: [baseVariant] })],
    })
  );
  range(4).forEach((i) => {
    // Add A1 to A4 as children of A
    $$$(tplTagA).append(
      mkTplTagX("div", {
        name: "A" + (i + 1),
        baseVariant,
        variants: [mkVariantSetting({ variants: [baseVariant] })],
      })
    );
  });
  $$$(tplTagB).append(
    mkTplTagX("div", {
      name: "BB",
      baseVariant,
      variants: [mkVariantSetting({ variants: [baseVariant] })],
    })
  );

  const cmp1 = tplMgr.addComponent({
    name: "My page",
    type: ComponentType.Page,
  });
  const cmp2 = tplMgr.addComponent({
    name: "My component",
    type: ComponentType.Plain,
  });

  const group = tplMgr.createVariantGroup({
    component: cmp,
    name: "Options",
    optionsType: VariantOptionsType.multiChoice,
  });
  tplMgr.createVariant(cmp, group, "Flat");
  tplMgr.createVariant(cmp, group, "Ghost");
  tplMgr.createVariant(cmp, group, "Rounded");
  const group2 = tplMgr.createVariantGroup({
    component: cmp,
    name: "Type",
    optionsType: VariantOptionsType.singleChoice,
  });
  tplMgr.createVariant(cmp, group2, "Primary");
  tplMgr.createVariant(cmp, group2, "Secondary");
  tplMgr.createVariant(cmp, group2, "Tertiary");
  const group3 = tplMgr.createVariantGroup({
    component: cmp,
    name: "Color",
    optionsType: VariantOptionsType.singleChoice,
  });
  tplMgr.createVariant(cmp, group3, "Red");
  tplMgr.createVariant(cmp, group3, "Green");
  tplMgr.createVariant(cmp, group3, "Blue");

  const arena = tplMgr.addArena("My custom arena");
  const frame = tplMgr.addNewMixedArenaFrame(arena, "My frame", cmp, {
    insertPt: new Pt(0, 0),
  });

  const hasSlots = tplMgr.addComponent({
    name: "HasSlots",
    type: ComponentType.Plain,
  });
  const hasSlotsBaseVariant = getBaseVariant(hasSlots);
  const slotParam1 = addSlotParam(site, hasSlots, "slot1");
  const tplSlot1 = mkSlot(slotParam1, [
    mkTplTagX("div", {
      name: "defaultContent",
      baseVariant: hasSlotsBaseVariant,
      variants: [mkVariantSetting({ variants: [hasSlotsBaseVariant] })],
    }),
  ]);
  tplSlot1.vsettings = [mkVariantSetting({ variants: [hasSlotsBaseVariant] })];

  const slotParam2 = addSlotParam(site, hasSlots, "slot2");
  const tplSlot2 = mkSlot(slotParam2);
  tplSlot2.vsettings = [mkVariantSetting({ variants: [hasSlotsBaseVariant] })];

  $$$(hasSlots.tplTree).append(tplSlot1);
  $$$(hasSlots.tplTree).append(tplSlot2);

  const instantiateSlotArgs = tplMgr.addComponent({
    name: "InstantiateSlotArgs",
    type: ComponentType.Plain,
  });
  const instantiateSlotArgsBaseVariant = getBaseVariant(instantiateSlotArgs);

  $$$(instantiateSlotArgs.tplTree).append(
    mkTplComponentX({
      name: "tplComp",
      baseVariant: instantiateSlotArgsBaseVariant,
      component: hasSlots,
      args: {
        slot1: new RenderExpr({
          tpl: [
            mkTplTagX("div", {
              name: "SlotArgNode1",
              baseVariant: instantiateSlotArgsBaseVariant,
              variants: [
                mkVariantSetting({
                  variants: [instantiateSlotArgsBaseVariant],
                }),
              ],
            }),
          ],
        }),
        slot2: new RenderExpr({
          tpl: [
            mkTplTagX("div", {
              name: "SlotArgNode2",
              baseVariant: instantiateSlotArgsBaseVariant,
              variants: [
                mkVariantSetting({
                  variants: [instantiateSlotArgsBaseVariant],
                }),
              ],
            }),
            mkTplTagX("div", {
              name: "SlotArgNode3",
              baseVariant: instantiateSlotArgsBaseVariant,
              variants: [
                mkVariantSetting({
                  variants: [instantiateSlotArgsBaseVariant],
                }),
              ],
            }),
          ],
        }),
      },
    })
  );

  const tplComp2 = mkTplComponentX({
    name: "tplComp2",
    baseVariant: instantiateSlotArgsBaseVariant,
    component: hasSlots,
  });

  $$$(instantiateSlotArgs.tplTree).append(tplComp2);

  fillVirtualSlotContents(tplMgr, tplComp2);

  return site;
}

export function singleComponentSite() {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  tplMgr.addComponent({
    name: "My page",
    type: ComponentType.Page,
  });
  return site;
}

export let lastBundleVersion: any;
export type TestResult = MergeStep & { preMergedSite: Site };

export async function fetchLastBundleVersion() {
  lastBundleVersion = await getLastBundleVersion();
}

export function applyTestMerge({
  ancestorBundle,
  ancestorUuid,
  aBundle,
  aUuid,
  bBundle,
  bUuid,
  directConflictsPicks,
}: {
  ancestorBundle: Bundle;
  ancestorUuid: string;
  aBundle: Bundle;
  aUuid: string;
  bBundle: Bundle;
  bUuid: string;
  directConflictsPicks?: BranchSide[];
}) {
  const mergedUuid = mkUuid();

  // We want to use a new bundler with no instances in the cache
  const cleanedUpBundler = new Bundler();
  const ancestorSite = ensureKnownSite(
    cleanedUpBundler.unbundle(
      jsonClone(ancestorBundle),
      ancestorUuid,
      lastBundleVersion
    )
  );
  const aSite = ensureKnownSite(
    cleanedUpBundler.unbundle(jsonClone(aBundle), aUuid, lastBundleVersion)
  );
  const bSite = ensureKnownSite(
    cleanedUpBundler.unbundle(jsonClone(bBundle), bUuid, lastBundleVersion)
  );

  // Make sure the initial sites are valid
  const fastBundler = new FastBundler();
  fastBundler.unbundleAndRecomputeParents(
    jsonClone(ancestorBundle),
    ancestorUuid
  );
  fastBundler.unbundleAndRecomputeParents(jsonClone(aBundle), aUuid);
  fastBundler.unbundleAndRecomputeParents(jsonClone(bBundle), bUuid);
  assertSiteInvariants(ancestorSite);
  assertSiteInvariants(aSite);
  assertSiteInvariants(bSite);

  const mergedSite = ensureKnownSite(
    cleanedUpBundler.unbundle(
      jsonClone(ancestorBundle),
      mergedUuid,
      lastBundleVersion
    )
  );

  const result: MergeStep & { preMergedSite?: Site } = tryMerge(
    ancestorSite,
    aSite,
    bSite,
    mergedSite,
    cleanedUpBundler,
    undefined
  );
  const mergedBundle = cleanedUpBundler.bundle(
    mergedSite,
    mergedUuid,
    lastBundleVersion
  );
  if (result.status === "needs-resolution") {
    assert(
      directConflictsPicks,
      "directConflictsPick must be supplied for any tests with conflicts"
    );
    const directConflicts = [
      ...result.genericDirectConflicts,
      ...result.specialDirectConflicts,
    ];
    const directConflictsRes = strictZip(
      directConflicts,
      directConflictsPicks
    ).map(([conflict, chosenSide]) => {
      return { ...conflict, side: chosenSide };
    });

    const directConflictsMap = Object.fromEntries(
      directConflictsRes.flatMap((cf) =>
        cf.conflictType === "generic"
          ? cf.conflictDetails.map((dt) => tuple(dt.pathStr, cf.side))
          : cf.conflictType === "special"
          ? [tuple(cf.pathStr, cf.side)]
          : []
      )
    );

    const newMergedUuid = mkUuid();
    const newMergedSite = cleanedUpBundler.unbundle(
      jsonClone(ancestorBundle),
      newMergedUuid
    ) as Site;

    const rez = tryMerge(
      ancestorSite,
      aSite,
      bSite,
      newMergedSite,
      cleanedUpBundler,
      directConflictsMap
    );
    assert(rez.status === "merged", "");
    result.preMergedSite = mergedSite;
    result.mergedSite = newMergedSite;
    const newMergedBundle = cleanedUpBundler.bundle(
      newMergedSite,
      newMergedUuid,
      lastBundleVersion
    );
    expect(newMergedBundle.deps).toEqual([]);
  }
  // Check that we are not leaking any unexpected dependencies!
  expect(mergedBundle.deps).toEqual([]);
  return { preMergedSite: ancestorSite, ...result };
}

export function testMerge({
  ancestorSite = createSite(),
  a = () => {},
  b = () => {},
  directConflictsPicks,
  useLegacyResolveConflicts = false,
  changeUpdatedAt = true,
}: {
  ancestorSite: Site | (() => Site);
  a: (site: Site, tplMgr: TplMgr) => void;
  b: (site: Site, tplMgr: TplMgr) => void;
  directConflictsPicks?: BranchSide[];
  useLegacyResolveConflicts?: boolean;
  changeUpdatedAt?: boolean;
}): TestResult {
  const ancestorUuid = mkUuid();
  const bundler = new Bundler();

  const bundle = bundler.bundle(
    typeof ancestorSite === "function" ? ancestorSite() : ancestorSite,
    ancestorUuid,
    lastBundleVersion
  );

  const aUuid = mkUuid();
  const draftASite = bundler.unbundle(jsonClone(bundle), aUuid) as Site;
  a(draftASite, new TplMgr({ site: draftASite }));

  const bUuid = mkUuid();
  const draftBSite = bundler.unbundle(jsonClone(bundle), bUuid) as Site;
  b(draftBSite, new TplMgr({ site: draftBSite }));

  if (changeUpdatedAt) {
    // We need to set the updatedAt to ensure that the components have different updatedAt and that they are considered updated
    // so that we don't ignore them, since we are not applying the changes with studioCtx.change
    draftASite.components.forEach((component) => {
      component.updatedAt = 1;
    });
    // We set to 2, just to be different from 1, but not necessary
    draftBSite.components.forEach((component) => {
      component.updatedAt = 2;
    });
  }

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

export function testMergeFromJsonBundle(
  json: ProjectFullDataResponse,
  {
    conflictPicks,
    skipConflictsChecks,
  }: {
    conflictPicks?: BranchSide[];
    skipConflictsChecks?: boolean;
  } = {}
) {
  assert(
    json.branches.length === 1,
    () => `Expected only one branch (other than main)`
  );
  assert(
    json.revisions.length === 2,
    () => `Expected only two revisions (latest From and To branches)`
  );
  const commitGraph = json.project.commitGraph;
  const ancestorCommit = getLowestCommonAncestor(
    json.project.id,
    commitGraph,
    json.branches[0].id,
    undefined
  );
  const ancestorPkgVersion = ensure(
    json.pkgVersions.find((pkgVersion) => pkgVersion.id === ancestorCommit),
    () => `Did not find ancestor commit ${ancestorCommit}`
  );
  const bundler = new Bundler();
  json.pkgVersions.forEach((dep) =>
    bundler.unbundle(jsonClone(dep.data), dep.id)
  );
  const ancestorSite = ensureKnownProjectDependency(
    bundler.unbundle(jsonClone(ancestorPkgVersion.data), ancestorCommit)
  ).site;
  const aSite = ensureKnownSite(
    bundler.unbundle(
      jsonClone(json.revisions[0].data),
      json.revisions[0].branchId
    )
  );

  const bSite = ensureKnownSite(
    bundler.unbundle(
      jsonClone(json.revisions[1].data),
      json.revisions[1].branchId
    )
  );
  const mergedSite = ensureKnownProjectDependency(
    bundler.unbundle(
      jsonClone(ancestorPkgVersion.data),
      `merged-${ancestorCommit}`
    )
  ).site;
  const result: MergeStep & { preMergedResults?: MergeDirectConflict } =
    tryMerge(ancestorSite, aSite, bSite, mergedSite, bundler, undefined);

  if (skipConflictsChecks) {
    return result;
  }

  if (result.status === "needs-resolution") {
    assert(
      conflictPicks,
      "conflictPicks must be supplied for any tests with conflicts"
    );
    const directConflicts = [
      ...result.genericDirectConflicts,
      ...result.specialDirectConflicts,
    ];
    const directConflictsRes = strictZip(directConflicts, conflictPicks).map(
      ([conflict, chosenSide]) => {
        return { ...conflict, side: chosenSide };
      }
    );

    const directConflictsMap = Object.fromEntries(
      directConflictsRes.flatMap((cf) =>
        cf.conflictType === "generic"
          ? cf.conflictDetails.map((dt) => tuple(dt.pathStr, cf.side))
          : cf.conflictType === "special"
          ? [tuple(cf.pathStr, cf.side)]
          : []
      )
    );

    const newMergedSite = ensureKnownProjectDependency(
      bundler.unbundle(
        jsonClone(ancestorPkgVersion.data),
        `merged-with-picks-${ancestorCommit}`
      )
    ).site;

    const rez: MergeStep & { preMergedResults?: MergeDirectConflict } =
      tryMerge(
        ancestorSite,
        aSite,
        bSite,
        newMergedSite,
        bundler,
        directConflictsMap
      );
    assert(rez.status === "merged", "should have merged");
    rez.preMergedResults = result;
    return {
      ...rez,
      ancestorSite,
      aSite,
      bSite,
    };
  } else {
    assert(!conflictPicks, "No conflicts");
  }

  return {
    ...result,
    ancestorSite,
    aSite,
    bSite,
  };
}
