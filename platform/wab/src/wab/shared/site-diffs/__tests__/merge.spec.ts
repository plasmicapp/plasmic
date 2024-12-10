import { TokenType, mkTokenRef } from "@/wab/commons/StyleToken";
import { removeFromArray } from "@/wab/commons/collections";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { getLowestCommonAncestor } from "@/wab/server/db/DbMgr";
import { ProjectFullDataResponse } from "@/wab/shared/ApiSchema";
import { mkArenaFrame } from "@/wab/shared/Arenas";
import { fillVirtualSlotContents } from "@/wab/shared/SlotUtils";
import {
  TplMgr,
  VariantOptionsType,
  ensureBaseVariant,
} from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import {
  ensureVariantSetting,
  getBaseVariant,
  isStyleVariant,
  mkVariantSetting,
} from "@/wab/shared/Variants";
import { Bundler, FastBundler } from "@/wab/shared/bundler";
import {
  createStyleTokenFromRegistration,
  mkCodeComponent,
} from "@/wab/shared/code-components/code-components";
import {
  assert,
  ensure,
  ensureType,
  generate,
  hackyCast,
  isJsonScalar,
  jsonClone,
  last,
  mkShortId,
  mkUuid,
  only,
  removeWhere,
  sorted,
  strictZip,
  swallow,
  tuple,
} from "@/wab/shared/common";
import {
  ComponentType,
  PageComponent,
  addSlotParam,
  removeVariantGroup,
} from "@/wab/shared/core/components";
import { asCode, codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { mkParam, mkParamsForState } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { addComponentState, mkState } from "@/wab/shared/core/states";
import {
  TplNamable,
  TplTagType,
  flattenTpls,
  isTplNamable,
  mkSlot,
  mkTplComponentX,
  mkTplInlinedText,
  mkTplTagX,
  tplChildren,
  trackComponentRoot,
  trackComponentSite,
} from "@/wab/shared/core/tpls";
import { mkDataSourceOpExpr } from "@/wab/shared/data-sources-meta/data-sources";
import { getProjectFlags } from "@/wab/shared/devflags";
import { Pt } from "@/wab/shared/geom";
import {
  Arg,
  Component,
  ComponentDataQuery,
  CustomCode,
  ExprText,
  ImageAsset,
  NodeMarker,
  ObjInst,
  ObjectPath,
  QueryInvalidationExpr,
  QueryRef,
  RawText,
  RenderExpr,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  VariantedValue,
  ensureKnownChoice,
  ensureKnownCustomCode,
  ensureKnownExprText,
  ensureKnownNodeMarker,
  ensureKnownObjectPath,
  ensureKnownProjectDependency,
  ensureKnownRawText,
  ensureKnownRenderExpr,
  ensureKnownSite,
  ensureKnownTplComponent,
  ensureKnownTplSlot,
  ensureKnownTplTag,
  ensureKnownVirtualRenderExpr,
  isKnownTplComponent,
  isKnownTplSlot,
  isKnownTplTag,
  isKnownVirtualRenderExpr,
} from "@/wab/shared/model/classes";
import { withoutUids } from "@/wab/shared/model/model-meta";
import { typeFactory } from "@/wab/shared/model/model-util";
import codeComponentsWithSameNameBundle from "@/wab/shared/site-diffs/__tests__/code-components-with-same-name.json";
import globalContextBundle from "@/wab/shared/site-diffs/__tests__/global-context-merge.json";
import richTextConflict from "@/wab/shared/site-diffs/__tests__/rich-text-conflict.json";
import styleTokenBundle from "@/wab/shared/site-diffs/__tests__/style-tokens-conflict.json";
import edgeCasesBundle2 from "@/wab/shared/site-diffs/__tests__/test-edge-cases-merge-2.json";
import edgeCasesBundle from "@/wab/shared/site-diffs/__tests__/test-edge-cases-merge.json";
import mergeDepsBundle from "@/wab/shared/site-diffs/__tests__/test-merging-deps.json";
import rerootBundle from "@/wab/shared/site-diffs/__tests__/test-reroot.json";
import mergeTplsBundle from "@/wab/shared/site-diffs/__tests__/test-tpl-merge.json";
import {
  BranchSide,
  MergeDirectConflict,
  MergeStep,
  tryMerge,
} from "@/wab/shared/site-diffs/merge-core";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import { isArray, isString, pick, range, sortBy } from "lodash";
import type { PartialDeep } from "type-fest";

const fixmeLater = false;

function upsertTokens(site: Site, tokens: Record<string, number>) {
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

function basicSite({
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

function singleComponentSite() {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  tplMgr.addComponent({
    name: "My page",
    type: ComponentType.Page,
  });
  return site;
}

let lastBundleVersion: any;

beforeAll(async () => {
  lastBundleVersion = await getLastBundleVersion();
});

type TestResult = MergeStep & { preMergedSite: Site };

function testMerge({
  ancestorSite = createSite(),
  a = () => {},
  b = () => {},
  directConflictsPicks,
  useLegacyResolveConflicts = false,
}: {
  ancestorSite: Site;
  a: (site: Site, tplMgr: TplMgr) => void;
  b: (site: Site, tplMgr: TplMgr) => void;
  directConflictsPicks?: BranchSide[];
  useLegacyResolveConflicts?: boolean;
}): TestResult {
  const ancestorUuid = mkUuid();
  const bundler = new Bundler();

  const bundle = bundler.bundle(ancestorSite, ancestorUuid, lastBundleVersion);

  const aUuid = mkUuid();
  const draftASite = bundler.unbundle(jsonClone(bundle), aUuid) as Site;
  a(draftASite, new TplMgr({ site: draftASite }));
  const finalABundle = bundler.bundle(draftASite, aUuid, lastBundleVersion);
  const bUuid = mkUuid();
  const draftBSite = bundler.unbundle(jsonClone(bundle), bUuid) as Site;
  b(draftBSite, new TplMgr({ site: draftBSite }));
  const finalBBundle = bundler.bundle(draftBSite, bUuid, lastBundleVersion);
  const mergedUuid = mkUuid();

  // We want to use a new bundler with no instances in the cache
  const cleanedUpBundler = new Bundler();
  ancestorSite = ensureKnownSite(
    cleanedUpBundler.unbundle(
      jsonClone(bundle),
      ancestorUuid,
      lastBundleVersion
    )
  );
  const aSite = ensureKnownSite(
    cleanedUpBundler.unbundle(jsonClone(finalABundle), aUuid, lastBundleVersion)
  );
  const bSite = ensureKnownSite(
    cleanedUpBundler.unbundle(jsonClone(finalBBundle), bUuid, lastBundleVersion)
  );

  // Make sure the initial sites are valid
  const fastBundler = new FastBundler();
  fastBundler.unbundleAndRecomputeParents(jsonClone(bundle), ancestorUuid);
  fastBundler.unbundleAndRecomputeParents(jsonClone(finalABundle), aUuid);
  fastBundler.unbundleAndRecomputeParents(jsonClone(finalBBundle), bUuid);
  assertSiteInvariants(ancestorSite);
  assertSiteInvariants(aSite);
  assertSiteInvariants(bSite);

  const mergedSite = ensureKnownSite(
    cleanedUpBundler.unbundle(jsonClone(bundle), mergedUuid, lastBundleVersion)
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
      jsonClone(bundle),
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

function testMergeFromJsonBundle(
  json: ProjectFullDataResponse,
  conflictPicks?: BranchSide[]
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
    return rez;
  } else {
    assert(!conflictPicks, "No conflicts");
  }
  return result;
}

describe("merging", () => {
  let [leftSubject, rightSubject, leftSubject2, rightSubject2]: any[] = [];
  let res: TestResult, ancestorSite: Site;

  // This is to work around a bug in jest that throws max call stack size error when trying to print our conflict/model structure
  function shallow(x: ObjInst & { uuid: string }) {
    return Object.fromEntries(
      Object.entries(x)
        .filter(([k, v]) => !isArray(v) && k !== "uid")
        .map(([k, v]) =>
          tuple(
            k,
            v === undefined ? null : isJsonScalar(v) ? v : isArray(v) ? [] : {}
          )
        )
    );
  }

  it("can cascade delete tokens referenced by uuids", () => {
    const rez = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        removeFromArray(site.styleTokens, (leftSubject = site.styleTokens[0]));
      },
      b: (site) => {
        (site.components[0].tplTree as TplTag).vsettings[0].rs.values[
          "line-height"
        ] = mkTokenRef(site.styleTokens[0]);
        site.styleTokens[1].value = mkTokenRef(site.styleTokens[0]);
        site.styleTokens[1].variantedValues.push(
          new VariantedValue({
            value: mkTokenRef(site.styleTokens[0]),
            variants: [site.globalVariantGroups[0].variants[0]],
          })
        );
      },
    });
    expect(rez).toMatchObject({
      status: "merged",
      ...(fixmeLater
        ? {
            autoReconciliations: [
              {
                violation: "referenced-deleted",
                deletedInst: leftSubject,
              },
            ],
          }
        : {}),
    });
    expect(
      (rez.mergedSite.components[0].tplTree as TplTag).vsettings[0].rs.values[
        "line-height"
      ]
    ).toEqual("1");
    expect(rez.mergedSite.styleTokens[0].name).not.toEqual(leftSubject.name);
    expect(rez.mergedSite.styleTokens[0].value).toEqual("1");
    expect(rez.mergedSite.styleTokens[0].variantedValues[0].value).toEqual("1");
  });

  it("has no conflicts when changing one side", () => {
    expect(
      testMerge({
        ancestorSite: basicSite(),
        a: (site) => {},
        b: (site) => upsertTokens(site, { x: 2 }),
      })
    ).toMatchObject(
      ensureType<PartialDeep<MergeStep, { recurseIntoArrays: true }>>({
        status: "merged",
        mergedSite: {
          styleTokens: [{ name: "x", value: "2" }, {}],
        },
      })
    );
  });

  it("has no conflicts when changing to same value", () => {
    expect(
      testMerge({
        ancestorSite: basicSite(),
        a: (site) => upsertTokens(site, { x: 2 }),
        b: (site) => upsertTokens(site, { x: 2 }),
      })
    ).toMatchObject(
      ensureType<PartialDeep<MergeStep, { recurseIntoArrays: true }>>({
        status: "merged",
        mergedSite: {
          styleTokens: [{ name: "x", value: "2" }, {}],
        },
      })
    );
  });

  it("has no conflicts when changing different items", () => {
    expect(
      testMerge({
        ancestorSite: basicSite(),
        a: (site) => upsertTokens(site, { x: 2 }),
        b: (site) => upsertTokens(site, { y: 2 }),
      })
    ).toMatchObject(
      ensureType<PartialDeep<MergeStep, { recurseIntoArrays: true }>>({
        status: "merged",
        mergedSite: {
          styleTokens: [
            {
              name: "x",
              value: "2",
            },
            {
              name: "y",
              value: "2",
            },
          ],
        },
      })
    );
  });

  it("has no conflicts when inserting new objects in array", () => {
    expect(
      testMerge({
        ancestorSite: basicSite(),
        a: (site) => upsertTokens(site, { a: 1 }),
        b: (site) => upsertTokens(site, { b: 1 }),
      })
    ).toMatchObject(
      ensureType<PartialDeep<MergeStep, { recurseIntoArrays: true }>>({
        status: "merged",
        mergedSite: {
          styleTokens: [
            {
              name: "x",
              value: "1",
            },
            {
              name: "y",
              value: "1",
            },
            {
              name: "a",
              value: "1",
            },
            {
              name: "b",
              value: "1",
            },
          ],
        },
      })
    );
  });

  it("has no conflicts when inserting new object in array on one side", () => {
    expect(
      testMerge({
        ancestorSite: basicSite(),
        a: (site) => {},
        b: (site) => upsertTokens(site, { b: 1 }),
      })
    ).toMatchObject(
      ensureType<PartialDeep<MergeStep, { recurseIntoArrays: true }>>({
        status: "merged",
        mergedSite: {
          styleTokens: [{}, {}, { name: "b", value: "1" }],
        },
      })
    );
  });

  it("has no conflicts when merging variant settings", () => {
    res = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        const root = site.components[0].tplTree as TplTag;
        root.vsettings.push(
          mkVariantSetting({
            variants: [site.globalVariantGroups[0].variants[0]],
            styles: {
              color: "red",
            },
          })
        );
      },
      b: (site) => {
        const root = site.components[0].tplTree as TplTag;
        root.vsettings.push(
          mkVariantSetting({
            variants: [site.globalVariantGroups[0].variants[0]],
            styles: {
              "font-size": "20px",
            },
          })
        );
      },
    });
    expect(res).toMatchObject(
      ensureType<PartialDeep<MergeStep>>({
        status: "merged",
      })
    );
    expect(
      pick(
        last((res.mergedSite.components[0].tplTree as TplTag).vsettings).rs
          .values,
        "color",
        "font-size"
      )
    ).toMatchObject({
      color: "red",
      "font-size": "20px",
    });
  });

  it("deep-merges to push down conflicts when merging rules", () => {
    res = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        const root = site.components[0].tplTree as TplTag;
        (leftSubject = root).vsettings[0].rs.values["color"] = "red";
      },
      b: (site) => {
        const root = site.components[0].tplTree as TplTag;
        (rightSubject = root).vsettings[0].rs.values["color"] = "blue";
      },
      directConflictsPicks: ["right"],
    });
    expect(res).toMatchObject(
      ensureType<PartialDeep<MergeStep, { recurseIntoArrays: true }>>({
        status: "needs-resolution",
        genericDirectConflicts: [
          {
            leftRoot: shallow(leftSubject),
            rightRoot: shallow(rightSubject),
            group: "TplTree",
            conflictDetails: [
              {
                leftUpdate: {
                  updatedFieldValue: { color: "red" },
                },
                rightUpdate: {
                  updatedFieldValue: { color: "blue" },
                },
              },
            ],
          },
        ],
      })
    );
    expect(
      (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].rs.values[
        "color"
      ]
    ).toEqual("blue");
  });

  it("merges background color of divs", () => {
    res = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        let tplTagA;
        flattenTpls((leftSubject = site.components[0].tplTree)).forEach(
          (tpl) => {
            if (isKnownTplTag(tpl) && tpl.name === "A") {
              tplTagA = tpl;
            }
          }
        );
        tplTagA.vsettings[0].rs.values["background"] =
          "linear-gradient(#EA0D0D, #EA0D0D)";
      },
      b: (site) => {
        let tplTagA;
        flattenTpls((rightSubject = site.components[0].tplTree)).forEach(
          (tpl) => {
            if (isKnownTplTag(tpl) && tpl.name === "A") {
              tplTagA = tpl;
            }
          }
        );
        tplTagA.vsettings[0].rs.values["background"] =
          "linear-gradient(#EEEEEE, #EEEEEE)";
      },
      directConflictsPicks: ["right"],
    });
    expect(res).toMatchObject(
      ensureType<PartialDeep<MergeStep, { recurseIntoArrays: true }>>({
        status: "needs-resolution",
        genericDirectConflicts: [
          {
            leftRoot: shallow(leftSubject),
            rightRoot: shallow(rightSubject),
            group: "TplTree",
            conflictDetails: [
              {
                leftUpdate: {
                  updatedFieldValue: {
                    background: "linear-gradient(#EA0D0D, #EA0D0D)",
                  },
                },
                rightUpdate: {
                  updatedFieldValue: {
                    background: "linear-gradient(#EEEEEE, #EEEEEE)",
                  },
                },
              },
            ],
          },
        ],
      })
    );
    let tplTagA;
    flattenTpls(res.mergedSite.components[0].tplTree).forEach((tpl) => {
      if (isKnownTplTag(tpl) && tpl.name === "A") {
        tplTagA = tpl;
      }
    });
    expect((tplTagA as TplTag).vsettings[0].rs.values["background"]).toEqual(
      "linear-gradient(#EEEEEE, #EEEEEE)"
    );
  });

  it("deep-merges rules", () => {
    res = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        const root = site.components[0].tplTree as TplTag;
        root.vsettings[0].rs.values["color"] = "red";
      },
      b: (site) => {
        const root = site.components[0].tplTree as TplTag;
        root.vsettings[0].rs.values["font-size"] = "20px";
      },
    });
    expect(res).toMatchObject(
      ensureType<PartialDeep<MergeStep>>({
        status: "merged",
      })
    );
    expect(
      pick(
        (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].rs.values,
        "color",
        "font-size"
      )
    ).toMatchObject({
      color: "red",
      "font-size": "20px",
    });
  });

  it("has no conflicts anywhere when updating a deleted item", () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          site.styleTokens.splice(0, 1);
        },
        b: (site) => {
          site.styleTokens[0].name = "x";
        },
      }))
    ).toMatchObject({
      status: "merged",
    });
    expect(
      res.mergedSite.styleTokens.length === basicSite().styleTokens.length - 1
    );
  });

  it("has no conflicts anywhere when updating a deleted component", () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site, tplMgr) => {
          tplMgr.removeComponent(site.components[0]);
        },
        b: (site) => {
          site.components[0].name = "aoeu";
        },
      }))
    ).toMatchObject({
      status: "merged",
    });
    expect(
      res.mergedSite.components.length === basicSite().components.length - 1
    );
  });

  it("properly conflicts between elements of an array that got changed on one side", () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject = site.styleTokens[1]).name = "a";
          site.styleTokens.splice(0, 1);
        },
        b: (site) => {
          (rightSubject = site.styleTokens[1]).name = "b";
        },
        directConflictsPicks: ["right"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "StyleToken",
        },
      ],
      preMergedSite: {
        styleTokens: [
          {
            name: "y",
          },
        ],
      },
      mergedSite: {
        styleTokens: [
          {
            name: "b",
          },
        ],
      },
    });
  });

  it("has no conflicts anywhere when creating harmless conflict and left got removed", () => {
    const ancSite = basicSite();
    ancSite.arenas[0].children.push(
      mkArenaFrame({
        site: ancSite,
        name: "",
        component: ancSite.components[0],
        height: 100,
        width: 100,
        pinnedGlobalVariants: {},
        pinnedVariants: {},
      })
    );
    expect(
      (res = testMerge({
        ancestorSite: ancSite,
        a: (site) => {
          site.arenas[0].children.splice(0, 1);
        },
        b: (site) => {
          site.arenas[0].children[0].name = "aoeu";
        },
      }))
    ).toMatchObject({
      status: "merged",
    });
    expect(
      res.mergedSite.arenas[0].children.length ===
        ancSite.arenas[0].children.length - 1
    );
  });

  describe("auto-reconciliations", () => {
    it("renames duplicates", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => ([leftSubject] = upsertTokens(site, { aaa: 1 })),
          b: (site) => ([rightSubject] = upsertTokens(site, { aaa: 1 })),
        })
      ).toMatchObject({
        status: "merged",
        autoReconciliations: [
          {
            violation: "duplicate-names",
            mergedInst: {
              ...withoutUids(shallow(rightSubject)),
              name: "aaa 2",
            },
            origName: "aaa",
            renamedTo: "aaa 2",
          },
        ],
      });
    });

    it("renames duplicate components (special handler)", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site, tplMgr) =>
            (leftSubject = tplMgr.addComponent({
              type: ComponentType.Plain,
              name: "X",
            })),
          b: (site, tplMgr) =>
            (rightSubject = tplMgr.addComponent({
              type: ComponentType.Plain,
              name: "X",
            })),
        })
      ).toMatchObject({
        status: "merged",
        autoReconciliations: [
          {
            violation: "duplicate-names",
            mergedInst: {
              ...withoutUids(shallow(rightSubject)),
              name: "X 2",
            },
            origName: "X",
            renamedTo: "X 2",
          },
        ],
      });
    });

    it("refactors when renaming duplicates", () => {
      function mkClashState() {
        const { valueParam, onChangeParam } = mkParamsForState({
          name: "variable",
          variableType: "text",
          accessType: "private",
          defaultExpr: codeLit('"a"'),
          previewExpr: codeLit('"a"'),
          onChangeProp: "on variable change",
        });

        return mkState({
          param: valueParam,
          variableType: "text",
          accessType: "private",
          onChangeParam,
        });
      }

      const testResult = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          const state = mkClashState();
          addComponentState(site, site.components[0], state);
          leftSubject = state.param;
          const tplTagA = (site.components[0].tplTree as TplTag).children[0];
          const baseVariant = getBaseVariant(site.components[0]);
          const textA = mkTplTagX("div", {
            type: TplTagType.Text,
            baseVariant,
            variants: [mkVariantSetting({ variants: [baseVariant] })],
          });
          textA.vsettings[0].text = new ExprText({
            expr: new ObjectPath({
              path: ["$state", "variable"],
              fallback: undefined,
            }),
            html: false,
          });
          $$$(tplTagA).append(textA);
        },
        b: (site) => {
          const state = mkClashState();
          addComponentState(site, site.components[0], state);
          rightSubject = state.param;
          const tplTagB = (site.components[0].tplTree as TplTag).children[1];
          const baseVariant = getBaseVariant(site.components[0]);
          const textB = mkTplTagX("div", {
            type: TplTagType.Text,
            baseVariant,
            variants: [mkVariantSetting({ variants: [baseVariant] })],
          });
          textB.vsettings[0].text = new ExprText({
            expr: new ObjectPath({
              path: ["$state", "variable"],
              fallback: undefined,
            }),
            html: false,
          });
          $$$(tplTagB).append(textB);
        },
      });

      expect(testResult).toMatchObject({
        status: "merged",
        autoReconciliations: [
          {
            violation: "duplicate-names",
            mergedInst: {
              ...withoutUids(shallow(rightSubject)),
              variable: {
                name: "variable 2",
              },
            },
            origName: "variable",
            renamedTo: "variable 2",
          },
        ],
      });

      const tplTree = ensureKnownTplTag(
        testResult.mergedSite.components[0].tplTree
      );
      const pathA = ensureKnownObjectPath(
        ensureKnownExprText(
          ensureKnownTplTag(ensureKnownTplTag(tplTree.children[0]).children[5])
            .vsettings[0].text
        ).expr
      ).path;
      const pathB = ensureKnownObjectPath(
        ensureKnownExprText(
          ensureKnownTplTag(ensureKnownTplTag(tplTree.children[1]).children[1])
            .vsettings[0].text
        ).expr
      ).path;
      expect(pathA).toStrictEqual(["$state", "variable"]);
      expect(pathB).toStrictEqual(["$state", "variable2"]);
    });

    it("renames duplicates in nested nameKeys", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site, tplMgr) => {
            tplMgr.renameVariantGroup(
              (leftSubject = site.components[0]).variantGroups[0],
              "clash"
            );
          },
          b: (site, tplMgr) => {
            tplMgr.renameVariantGroup(
              (rightSubject = site.components[0]).variantGroups[2],
              "clash"
            );
          },
        })
      ).toMatchObject({
        status: "merged",
        autoReconciliations: [
          {
            violation: "duplicate-names",
            mergedInst: {
              variable: {
                name: "clash 2",
              },
            },
            origName: "clash",
            renamedTo: "clash 2",
          },
        ],
      });
    });
  });

  it("handles conflicts on differing value changes (basic)", () => {
    expect(
      (res = testMerge({
        ancestorSite: (ancestorSite = basicSite()),
        a: (site) => ([leftSubject] = upsertTokens(site, { x: 2 })),
        b: (site) => ([rightSubject] = upsertTokens(site, { x: 3 })),
        directConflictsPicks: ["left"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          leftRootPath: ["styleTokens", "0"],
          rightRootPath: ["styleTokens", "0"],
          group: "StyleToken",
        },
      ],
    });
    expect(res.mergedSite.styleTokens[0].value).toBe("2");
  });

  it("handles conflicts on names", () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          site.styleTokens[0].name = "a";
          leftSubject = site.styleTokens[0];
        },
        b: (site) => {
          site.styleTokens[0].name = "b";
          rightSubject = site.styleTokens[0];
        },
        directConflictsPicks: ["right"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "StyleToken",
        },
      ],
    });
    expect(res.mergedSite.styleTokens[0].name).toBe("b");
  });

  it("applies partial merges on conflict", () => {
    expect(
      testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          site.styleTokens[0].name = "a";
          site.styleTokens[0].value = "42";
          leftSubject = site.styleTokens[0];
        },
        b: (site) => {
          site.styleTokens[0].name = "b";
          site.styleTokens[0].value = "42";
          rightSubject = site.styleTokens[0];
        },
        directConflictsPicks: ["right"],
      })
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "StyleToken",
        },
      ],
      preMergedSite: {
        styleTokens: [{ name: "x", value: "42" }, {}],
      },
      mergedSite: {
        styleTokens: [{ name: "b", value: "42" }, {}],
      },
    });
  });

  it("handles conflicts on entire top Site object if no nested groupings catch it", () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject = site).globalVariant.description = "a";
        },
        b: (site) => {
          (rightSubject = site).globalVariant.description = "b";
        },
        directConflictsPicks: ["left"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "Site",
        },
      ],
    });
    expect(res.mergedSite.globalVariant.description).toBe("a");
  });

  it("handles conflicts on basic component-level fields (ensure that shallow() test helper works)", () => {
    // This mostly ensures that shallow() works (printing the component directly triggers jest bug throwing max recursion error).
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject = site.components[0]).name = "a";
        },
        b: (site) => {
          (rightSubject = site.components[0]).name = "b";
        },
        directConflictsPicks: ["right"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "Component",
        },
      ],
    });
    expect(res.mergedSite.components[0].name).toBe("b");
  });

  it("handles conflicts in ComponentVariantGroup param", () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject =
            site.components[0].variantGroups[0].param).variable.name = "a";
        },
        b: (site) => {
          (rightSubject =
            site.components[0].variantGroups[0].param).variable.name = "b";
        },
        directConflictsPicks: ["left"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "ComponentParam",
        },
      ],
    });
    expect(
      res.mergedSite.components[0].variantGroups[0].param.variable.name
    ).toBe("a");
  });

  it(`handles conflicts on an "outer" high-level object grouping (VariantGroup)`, () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject = site.globalVariantGroups[0]).param.variable.name =
            "screen-a";
        },
        b: (site) => {
          (rightSubject = site.globalVariantGroups[0]).param.variable.name =
            "screen-b";
        },
        directConflictsPicks: ["right"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "GlobalVariantGroup",
        },
      ],
    });
    expect(res.mergedSite.globalVariantGroups[0].param.variable.name).toBe(
      "screen-b"
    );
  });

  it("handles conflicts on an inner high-level object grouping (VariantGroup > Variant)", () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject = site.globalVariantGroups[0].variants[0]).mediaQuery =
            "media-query-a";
        },
        b: (site) => {
          (rightSubject = site.globalVariantGroups[0].variants[0]).mediaQuery =
            "media-query-b";
        },
        directConflictsPicks: ["left"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "GlobalVariant",
        },
      ],
    });
    expect(res.mergedSite.globalVariantGroups[0].variants[0].mediaQuery).toBe(
      "media-query-a"
    );
  });

  it("handles conflicts on object of the same type that appears lower in the model tree (Variant inside Components)", () => {
    // Example: component variant
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject =
            site.components[0].variantGroups[0].variants[0]).description = "a";
        },
        b: (site) => {
          (rightSubject =
            site.components[0].variantGroups[0].variants[0]).description = "b";
        },
        directConflictsPicks: ["left"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "Variant",
        },
      ],
    });
    expect(
      res.mergedSite.components[0].variantGroups[0].variants[0].description
    ).toBe("a");
  });

  it("handles WeakRef change conflicts", () => {
    // components[3].pagesettings.openGraphImage
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject = ensure(
            site.components.find((c) => c.type === ComponentType.Page),
            ""
          ) as PageComponent).pageMeta.openGraphImage = site.imageAssets[0];
        },
        b: (site) => {
          (rightSubject = ensure(
            site.components.find((c) => c.type === ComponentType.Page),
            ""
          ) as PageComponent).pageMeta.openGraphImage = site.imageAssets[1];
        },
        directConflictsPicks: ["right"],
      }))
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "Component",
        },
      ],
    });
    const resSubject = (
      ensure(
        res.mergedSite.components.find((c) => c.type === ComponentType.Page),
        ""
      ) as PageComponent
    ).pageMeta.openGraphImage;
    expect((resSubject as ImageAsset).name).toBe("image 2");
  });

  describe("maps", () => {
    it("merges maps with ObjInst values", () => {
      // Conflict on map, for example:
      // theme mixin rulesets
      // tplTag.vsettings.0.attrs
      // page metadata
      expect(
        (res = testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            leftSubject = site.components[0];
            (site.components[0].tplTree as TplTag).vsettings[0].attrs["a"] =
              codeLit("1");
            (site.components[0].tplTree as TplTag).vsettings[0].attrs["b"] =
              codeLit("2");
          },
          b: (site) => {
            rightSubject = site.components[0];
            (site.components[0].tplTree as TplTag).vsettings[0].attrs["a"] =
              codeLit("1");
            (site.components[0].tplTree as TplTag).vsettings[0].attrs["c"] =
              codeLit("3");
          },
        }))
      ).toMatchObject({
        status: "merged",
      });
      expect(
        (
          (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].attrs[
            "a"
          ] as CustomCode
        ).code
      ).toBe('"1"');
      expect(
        (
          (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].attrs[
            "b"
          ] as CustomCode
        ).code
      ).toBe('"2"');
      expect(
        (
          (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].attrs[
            "c"
          ] as CustomCode
        ).code
      ).toBe('"3"');
    });

    it("deep-merges conflicts on maps with ObjInst values", () => {
      expect(
        (res = testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            leftSubject = site.components[0].tplTree;
            (site.components[0].tplTree as TplTag).vsettings[0].attrs["a"] =
              codeLit("1");
            (site.components[0].tplTree as TplTag).vsettings[0].attrs["b"] =
              codeLit("2");
          },
          b: (site) => {
            rightSubject = site.components[0].tplTree;
            (site.components[0].tplTree as TplTag).vsettings[0].attrs["a"] =
              codeLit("11");
            (site.components[0].tplTree as TplTag).vsettings[0].attrs["c"] =
              codeLit("3");
          },
          directConflictsPicks: ["right"],
        }))
      ).toMatchObject({
        status: "needs-resolution",
        genericDirectConflicts: [
          {
            leftRoot: shallow(leftSubject),
            rightRoot: shallow(rightSubject),
            group: "TplTree",
          },
        ],
      });
      expect(
        (
          (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].attrs[
            "a"
          ] as CustomCode
        ).code
      ).toBe('"11"');
      expect(
        (
          (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].attrs[
            "b"
          ] as CustomCode
        ).code
      ).toBe('"2"');
      expect(
        (
          (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].attrs[
            "c"
          ] as CustomCode
        ).code
      ).toBe('"3"');
    });

    it("merges maps with scalar values", () => {
      expect(
        (res = testMerge({
          ancestorSite: (ancestorSite = basicSite()),
          a: (site) => {
            leftSubject = site.components[0].metadata["a"] = "1";
            leftSubject = site.components[0].metadata["b"] = "2";
          },
          b: (site) => {
            rightSubject = site.components[0].metadata["a"] = "1";
            rightSubject = site.components[0].metadata["c"] = "3";
          },
        }))
      ).toMatchObject({
        status: "merged",
      });
      expect(res.mergedSite.components[0].metadata["a"]).toBe("1");
      expect(res.mergedSite.components[0].metadata["b"]).toBe("2");
      expect(res.mergedSite.components[0].metadata["c"]).toBe("3");
    });

    it("handles map conflicts with scalar values", () => {
      expect(
        (res = testMerge({
          ancestorSite: (ancestorSite = basicSite()),
          a: (site) => {
            leftSubject = site.components[0];
            site.components[0].metadata["a"] = "1";
            site.components[0].metadata["b"] = "2";
          },
          b: (site) => {
            rightSubject = site.components[0];
            site.components[0].metadata["a"] = "11";
            site.components[0].metadata["c"] = "3";
          },
          directConflictsPicks: ["right"],
        }))
      ).toMatchObject({
        status: "needs-resolution",
        genericDirectConflicts: [
          {
            leftRoot: shallow(leftSubject),
            rightRoot: shallow(rightSubject),
            group: "Component",
          },
        ],
      });
      expect(res.mergedSite.components[0].metadata["a"]).toBe("11");
      expect(res.mergedSite.components[0].metadata["b"]).toBe("2");
      expect(res.mergedSite.components[0].metadata["c"]).toBe("3");
    });
  });

  it.skip("handles conflicts on nested items, i.e. coalesce outer structures", () => {
    // Ignore meaningless intermediate structure conflicts.
    // I.e., should not conflict on the outer structure, which is implicitly merged!
    // Conflicts are instead on the inner items.
    //
    // Should only do this for objects that are either:
    //
    // - some field, e.g. VariantSettings.text or Component.pageSettings
    // - some map, e.g. VariantSettings.attrs
    // - but NOT arrays, e.g. Component.params
    // - UNLESS that array is actually a "set" (or "map"), such as: VariantSettings.variants, TplNode.vsettings, VariantSettings.args
    //
    // The only important case is really TplNode.vsettings. It is the only one that feels like it could be very common.
    // Users would just need to make (completely unrelated) edits to the same element while targeting the same variant.
    // In that case, two different new VariantSetting instances would result.
    //
    // Should also double check the above rules... Are single fields and map values and set values never referenced from elsewhere? Or else we would need deletion cascading (or even reference replacement) on the side that doesn't get chosen for the merge...
    expect(
      testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          [leftSubject, leftSubject2] = site.components.slice(0, 2);
          for (const component of site.components.slice(0, 2)) {
            const root = component.tplTree as TplTag;
            root.vsettings.push(
              mkVariantSetting({
                variants: [site.globalVariant],
                styles: {
                  color: "red",
                },
              })
            );
          }
        },
        b: (site) => {
          [rightSubject, rightSubject2] = site.components.slice(0, 2);
          for (const component of site.components.slice(0, 2)) {
            const root = component.tplTree as TplTag;
            root.vsettings.push(
              mkVariantSetting({
                variants: [site.globalVariant],
                styles: {
                  color: "green",
                },
              })
            );
          }
        },
      })
    ).toMatchObject({
      status: "needs-resolution",
      genericDirectConflicts: [
        {
          leftRoot: shallow(leftSubject),
          rightRoot: shallow(rightSubject),
          group: "Component",
        },
        {
          leftRoot: shallow(leftSubject2),
          rightRoot: shallow(rightSubject2),
          group: "Component",
        },
      ],
    });
  });

  describe("'content'-labeled fields", () => {
    it("merges 'content'-labeled fields", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            (
              (leftSubject = site.components[0]).tplTree as TplTag
            ).vsettings[0].text = new RawText({
              markers: [],
              text: "a",
            });
          },
          b: (site) => {
            (
              (rightSubject = site.components[0]).tplTree as TplTag
            ).vsettings[0].text = new RawText({
              markers: [],
              text: "a",
            });
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });

    it("handles conflicts on 'content'-labeled fields", () => {
      expect(
        (res = testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            (leftSubject = site.components[0]
              .tplTree as TplTag).vsettings[0].text = new RawText({
              markers: [],
              text: "a",
            });
          },
          b: (site) => {
            (rightSubject = site.components[0]
              .tplTree as TplTag).vsettings[0].text = new RawText({
              markers: [],
              text: "b",
            });
          },
          directConflictsPicks: ["right"],
        }))
      ).toMatchObject({
        status: "needs-resolution",
        genericDirectConflicts: [
          {
            leftRoot: shallow(leftSubject),
            rightRoot: shallow(rightSubject),
            group: "TplTree",
          },
        ],
      });
      expect(
        (
          (res.mergedSite.components[0].tplTree as TplTag).vsettings[0]
            .text as RawText
        ).text
      ).toBe("b");
    });

    it("merges identical 'content' changes in maps", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            (
              (leftSubject = site.components[0]).tplTree as TplTag
            ).vsettings[0].attrs["title"] = codeLit("0");
          },
          b: (site) => {
            (
              (rightSubject = site.components[0]).tplTree as TplTag
            ).vsettings[0].attrs["title"] = codeLit("0");
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });
  });

  describe("arrays", () => {
    it("merges arrays of primitive values", () => {
      // Examples
      // - userManagedFonts
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            (leftSubject = site.userManagedFonts).push("a");
            (leftSubject = site.userManagedFonts).push("b");
          },
          b: (site) => {
            site.userManagedFonts.splice(0, 1);
            (rightSubject = site.userManagedFonts).push("b");
          },
        })
      ).toMatchObject({
        status: "merged",
        mergedSite: {
          userManagedFonts: ["a", "b"],
        },
      });
    });

    it("handles conflicts on order-sensitive array of nested objects", () => {
      const cyclicShift = (arr: any[], left: boolean) => {
        if (left) {
          const firstElement = arr.shift();
          arr.push(firstElement);
        } else {
          const lastElement = arr.pop();
          arr.unshift(lastElement);
        }
      };

      // Example operations:
      // - reorder
      expect(
        (res = testMerge({
          ancestorSite: (() => {
            const site = basicSite();
            const tplMgr = new TplMgr({ site });
            const component = site.components[2];
            tplMgr.createVariantGroup({
              component,
            });
            tplMgr.createVariantGroup({
              component,
            });
            tplMgr.createVariantGroup({
              component,
            });
            return site;
          })(),
          a: (site) => {
            const vg = site.components[0].variantGroups[0];
            // Also create a conflict on nested object!
            (leftSubject2 = vg.variants[1]).name = "a";
            cyclicShift((leftSubject = vg).variants, true);
          },
          b: (site) => {
            const vg = site.components[0].variantGroups[0];
            (rightSubject2 = vg.variants[1]).name = "b";
            cyclicShift((rightSubject = vg).variants, false);
          },
          directConflictsPicks: ["left", "right"],
        }))
      ).toMatchObject({
        status: "needs-resolution",
        genericDirectConflicts: [
          {
            leftRoot: shallow(leftSubject),
            rightRoot: shallow(rightSubject),
            group: "VariantGroup",
          },
          {
            leftRoot: shallow(leftSubject2),
            rightRoot: shallow(rightSubject2),
            group: "Variant",
          },
        ],
      });
      expect(
        res.mergedSite.components[0].variantGroups[0].variants.map(
          (v) => v.name
        )
      ).toEqual(["b", "Rounded", "Flat"]);
    });

    it("handles conflicts on order-sensitive array of WeakRefs", () => {
      // Examples:
      // VariantSettings.mixins
      expect(
        (res = testMerge({
          ancestorSite: (() => {
            const site = basicSite();
            (site.components[0].tplTree as TplTag).vsettings[0].rs.mixins = [
              site.mixins[0],
              site.mixins[1],
              site.mixins[2],
            ];
            return site;
          })(),
          a: (site) => {
            (leftSubject = site.components[0]
              .tplTree as TplTag).vsettings[0].rs.mixins = [
              site.mixins[2],
              site.mixins[0],
              site.mixins[1],
            ];
          },
          b: (site) => {
            (rightSubject = site.components[0]
              .tplTree as TplTag).vsettings[0].rs.mixins = [
              site.mixins[1],
              site.mixins[2],
              site.mixins[0],
            ];
          },
          directConflictsPicks: ["right"],
        }))
      ).toMatchObject({
        status: "needs-resolution",
        genericDirectConflicts: [
          {
            leftRoot: shallow(leftSubject),
            rightRoot: shallow(rightSubject),
            group: "TplTree",
          },
        ],
      });
      expect(
        (res.mergedSite.components[0].tplTree as TplTag).vsettings[0].rs.mixins
      ).toMatchObject([
        {
          name: "My mixin 2",
        },
        {
          name: "My mixin 3",
        },
        {
          name: "My mixin 1",
        },
      ]);
    });

    it("merges insertions and deletions on arrays", () => {
      // Examples that should just work for either of the above:
      // - insertion
      // - deletion (of the same or different items)
      res = testMerge({
        ancestorSite: basicSite(),
        a: (site, tplMgr) => {
          const component = site.components[0];
          tplMgr.createVariantGroup({
            component,
          });
          leftSubject = component;
        },
        b: (site, tplMgr) => {
          const component = site.components[0];
          tplMgr.createVariantGroup({
            component,
          });
          rightSubject = component;
        },
      });
      expect(res).toMatchObject({
        status: "merged",
      });
      expect(res.mergedSite.components[0].variantGroups).toMatchObject([
        {
          param: { variable: { name: "Options" } },
        },
        {
          param: { variable: { name: "Type" } },
        },
        {
          param: { variable: { name: "Color" } },
        },
        {},
        {},
      ]);

      expect(
        (res = testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            const component = site.components[0];
            removeVariantGroup(
              site,
              component,
              site.components[0].variantGroups[0]
            );
            removeVariantGroup(
              site,
              component,
              site.components[0].variantGroups[0]
            );
            leftSubject = component;
          },
          b: (site) => {
            const component = site.components[0];
            removeVariantGroup(
              site,
              component,
              site.components[0].variantGroups[1]
            );
            rightSubject = component;
          },
        }))
      ).toMatchObject(
        ensureType<PartialDeep<MergeStep>>({
          status: "merged",
        })
      );
      expect(res.mergedSite.components[0].variantGroups).toMatchObject([
        { param: { variable: { name: "Color" } } },
      ]);
    });

    it("handles conflicts on order-insensitive array of nested objects", () => {
      // Conflicts on order-insensitive array of nested objects
      // Examples
      // - Component.params
      // Example operations:
      // - reorder
      // - insertion (tested above already with variant group)
      // - deletion (tested above already with variant group)
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            const component = site.components[0];
            (leftSubject = component).params = [
              component.params[1],
              component.params[2],
              component.params[0],
              ...component.params.slice(3),
            ];
          },
          b: (site) => {
            const component = site.components[0];
            (rightSubject = component).params = [
              component.params[2],
              component.params[0],
              component.params[1],
              ...component.params.slice(3),
            ];
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });

    it("merges deletions on order-sensitive array of unique WeakRefs", () => {
      // Set operations - conflict on order-insensitive array of unique WeakRef
      // Examples: tplTag.vsettings[0].variants
      expect(
        testMerge({
          ancestorSite: (() => {
            const site = basicSite();
            (site.components[0].tplTree as TplTag).vsettings[0].rs.mixins = [
              site.mixins[0],
              site.mixins[1],
            ];
            return site;
          })(),
          a: (site) => {
            (
              (leftSubject = site.components[0]).tplTree as TplTag
            ).vsettings[0].rs.mixins = [site.mixins[0]];
          },
          b: (site) => {
            (
              (rightSubject = site.components[0]).tplTree as TplTag
            ).vsettings[0].rs.mixins = [site.mixins[1]];
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });

    it("merges insertions on order-insensitive arrays of unique WeakRefs", () => {
      expect(
        testMerge({
          ancestorSite: (() => {
            const site = basicSite();
            (site.components[0].tplTree as TplTag).vsettings[0].rs.mixins = [
              site.mixins[0],
            ];
            return site;
          })(),
          a: (site) => {
            (
              (leftSubject = site.components[0]).tplTree as TplTag
            ).vsettings[0].rs.mixins = [site.mixins[0], site.mixins[1]];
          },
          b: (site) => {
            (
              (rightSubject = site.components[0]).tplTree as TplTag
            ).vsettings[0].rs.mixins = [site.mixins[0], site.mixins[2]];
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });

    it("merges reorders on order-insensitive arrays of unique WeakRefs", () => {
      expect(
        testMerge({
          ancestorSite: (() => {
            const site = basicSite();
            const vgroup = site.globalVariantGroups[1];
            (site.components[0].tplTree as TplTag).vsettings.push(
              mkVariantSetting({
                variants: [
                  vgroup.variants[0],
                  vgroup.variants[1],
                  vgroup.variants[2],
                ],
              })
            );
            return site;
          })(),
          a: (site) => {
            const vgroup = site.globalVariantGroups[1];
            (
              (leftSubject = site.components[0]).tplTree as TplTag
            ).vsettings[1].variants = [
              vgroup.variants[2],
              vgroup.variants[0],
              vgroup.variants[1],
            ];
          },
          b: (site) => {
            const vgroup = site.globalVariantGroups[1];
            (
              (rightSubject = site.components[0]).tplTree as TplTag
            ).vsettings[1].variants = [
              vgroup.variants[1],
              vgroup.variants[2],
              vgroup.variants[0],
            ];
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });
  });

  it("TODO", () => {
    // Conflict on map to WeakRef
    // Examples:
    // Site.defaultComponents
    //
    // Conflict on special change - make sure special handlers actually work
    //
  });

  describe("array mergeKeys", () => {
    it("has no conflict for different mergeKeys", () => {
      // mergeKey resolves to two different things
      res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          site.styleTokens[0].variantedValues.push(
            new VariantedValue({
              variants: [site.globalVariantGroups[0].variants[0]],
              value: "1",
            })
          );
        },
        b: (site) => {
          site.styleTokens[0].variantedValues.push(
            new VariantedValue({
              variants: [
                site.globalVariantGroups[0].variants[0],
                site.globalVariantGroups[1].variants[0],
              ],
              value: "2",
            })
          );
        },
      });
      expect(res).toMatchObject({
        status: "merged",
      });
      expect(res.mergedSite.styleTokens[0].variantedValues).toMatchObject([
        {
          variants: [{}],
        },
        {
          variants: [{}, {}],
        },
      ]);
    });

    it("handles conflicts when deep-merging where the path contains other mergeKey'd parents", () => {
      // mergeKey resolves to two different things
      res = testMerge({
        ancestorSite: (() => {
          const site = basicSite();
          site.mixins[0].rs.values["color"] = "#000";
          return site;
        })(),
        a: (site) => {
          site.mixins[0].rs.values["color"] = "#aaa";
        },
        b: (site) => {
          site.mixins[0].rs.values["color"] = "#bbb";
        },
        directConflictsPicks: ["right"],
      });
      expect(res).toMatchObject({
        status: "needs-resolution",
      });
      expect(res.mergedSite.mixins[0].rs.values["color"]).toEqual("#bbb");
    });

    it("deep-merges same mergeKeys", () => {
      res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          (leftSubject = site.styleTokens[0]).variantedValues.push(
            new VariantedValue({
              variants: [
                site.globalVariantGroups[0].variants[0],
                site.globalVariantGroups[1].variants[0],
              ],
              value: "1",
            })
          );
        },
        b: (site) => {
          (rightSubject = site.styleTokens[0]).variantedValues.push(
            new VariantedValue({
              variants: [
                site.globalVariantGroups[0].variants[0],
                site.globalVariantGroups[1].variants[0],
              ],
              value: "2",
            })
          );
        },
        directConflictsPicks: ["right"],
      });
      expect(res).toMatchObject({
        status: "needs-resolution",
        genericDirectConflicts: [
          {
            leftRoot: shallow(leftSubject),
            rightRoot: shallow(rightSubject),
            conflictDetails: [
              {
                leftUpdate: {
                  field: {
                    name: "value",
                  },
                  updatedInst: {
                    value: "1",
                  },
                },
                rightUpdate: {
                  updatedInst: {
                    value: "2",
                  },
                },
              },
            ],
          },
        ],
      });
      expect(res.mergedSite.styleTokens[0].variantedValues).toMatchObject([
        {
          variants: [{}, {}],
          value: "2",
        },
      ]);

      // TODO
      // Set operations, like the above, but on arrays keyed by something more specialized than just identity equality
      // Examples:
      // - tplTag.vsettings.0.args (keyed by .param)
      // - tplTag.vsettings (keyed by .variants)
      // - styleToken.variantedValue (keyed by .variants)
      // Example operations:
      // - Set removal
      // - Set addition
      // Should not care about reordering for order-insensitive
    });

    it("handle mergeKeys deleted in both branches", () => {
      res = testMerge({
        ancestorSite: (() => {
          const site = basicSite();
          const cmp = ensure(
            site.components.find((c) => c.name === "Button"),
            () => `Component "Button" not found`
          );
          cmp.tplTree.vsettings.push(
            mkVariantSetting({
              variants: [
                cmp.variantGroups[0].variants[0],
                cmp.variantGroups[0].variants[1],
              ],
              attrs: {
                foo: codeLit(10),
              },
            })
          );
          return site;
        })(),
        a: (site) => {
          const cmp = ensure(
            site.components.find((c) => c.name === "Button"),
            () => `Component "Button" not found`
          );
          removeVariantGroup(site, cmp, cmp.variantGroups[0]);
        },
        b: (site) => {
          const cmp = ensure(
            site.components.find((c) => c.name === "Button"),
            () => `Component "Button" not found`
          );
          cmp.tplTree.vsettings.push(
            mkVariantSetting({
              variants: [cmp.variantGroups[1].variants[0]],
              attrs: {
                foo: codeLit(2),
              },
            })
          );
          removeVariantGroup(site, cmp, cmp.variantGroups[0]);
        },
      });
      expect(res).toMatchObject({
        status: "merged",
      });
      const cmp = ensure(
        res.mergedSite.components.find((c) => c.name === "Button"),
        () => `Component "Button" not found`
      );
      expect(cmp.tplTree.vsettings.length).toBe(2);
      expect(
        ensureKnownCustomCode(cmp.tplTree.vsettings[1].attrs["foo"]).code
      ).toBe("2");
    });

    it("mergeKeyFn returns correct value", () => {
      const baseSite = basicSite();
      baseSite.components[0].dataQueries.push(
        new ComponentDataQuery({
          uuid: mkShortId(),
          name: "test-name",
          op: mkDataSourceOpExpr({
            sourceId: "airtable",
            opId: "test",
            opName: "operation",
            queryInvalidation: new QueryInvalidationExpr({
              invalidationQueries: [],
              invalidationKeys: undefined,
            }),
          }),
        })
      );
      res = testMerge({
        ancestorSite: baseSite,
        a: (site) => {
          site.components[0].dataQueries[0].op!.queryInvalidation!.invalidationQueries.push(
            "testing-string-equal"
          );
          site.components[0].dataQueries[0].op!.queryInvalidation!.invalidationQueries.push(
            new QueryRef({ ref: site.components[0].dataQueries[0] })
          );
        },
        b: (site) => {
          site.components[0].dataQueries[0].op!.queryInvalidation!.invalidationQueries.push(
            new QueryRef({ ref: site.components[0].dataQueries[0] })
          );
          site.components[0].dataQueries[0].op!.queryInvalidation!.invalidationQueries.push(
            "testing-string-equal"
          );
        },
      });
      expect(res).toMatchObject({
        status: "merged",
      });
      expect(
        res.mergedSite.components[0].dataQueries[0].op!.queryInvalidation!.invalidationQueries!.map(
          (v) => (isString(v) ? v : v.ref.uuid)
        )
      ).toMatchObject([
        "testing-string-equal",
        baseSite.components[0].dataQueries[0].uuid,
      ]);
    });
  });

  describe("tpl tree", () => {
    it("merges moves of different tpls to different locations", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            let tplTagC, tplTagAA;
            flattenTpls(site.components[0].tplTree).forEach((tpl) => {
              if (isKnownTplTag(tpl) && tpl.name === "C") {
                tplTagC = tpl;
              }
              if (isKnownTplTag(tpl) && tpl.name === "AA") {
                tplTagAA = tpl;
              }
            });
            $$$(tplTagC).append(tplTagAA);
          },
          b: (site) => {
            let tplTagD, tplTagBB;
            flattenTpls(site.components[0].tplTree).forEach((tpl) => {
              if (isKnownTplTag(tpl) && tpl.name === "D") {
                tplTagD = tpl;
              }
              if (isKnownTplTag(tpl) && tpl.name === "BB") {
                tplTagBB = tpl;
              }
            });
            $$$(tplTagD).append(tplTagBB);
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });

    it("merges moves of same tpl to same location", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            let tplTagC, tplTagAA;
            flattenTpls(site.components[0].tplTree).forEach((tpl) => {
              if (isKnownTplTag(tpl) && tpl.name === "C") {
                tplTagC = tpl;
              }
              if (isKnownTplTag(tpl) && tpl.name === "AA") {
                tplTagAA = tpl;
              }
            });
            $$$(tplTagC).append(tplTagAA);
          },
          b: (site) => {
            let tplTagC, tplTagAA;
            flattenTpls(site.components[0].tplTree).forEach((tpl) => {
              if (isKnownTplTag(tpl) && tpl.name === "C") {
                tplTagC = tpl;
              }
              if (isKnownTplTag(tpl) && tpl.name === "AA") {
                tplTagAA = tpl;
              }
            });
            $$$(tplTagC).append(tplTagAA);
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });

    it("conflicts on moves of same tpl to different locations", () => {
      expect(
        (res = testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            let tplTagC, tplTagAA;
            flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
              (tpl) => {
                if (isKnownTplTag(tpl) && tpl.name === "C") {
                  tplTagC = tpl;
                }
                if (isKnownTplTag(tpl) && tpl.name === "AA") {
                  tplTagAA = tpl;
                }
              }
            );
            $$$(tplTagC).append(tplTagAA);
          },
          b: (site) => {
            let tplTagD, tplTagAA;
            flattenTpls((rightSubject = site.components[0]).tplTree).forEach(
              (tpl) => {
                if (isKnownTplTag(tpl) && tpl.name === "D") {
                  tplTagD = tpl;
                }
                if (isKnownTplTag(tpl) && tpl.name === "AA") {
                  tplTagAA = tpl;
                }
              }
            );
            $$$(tplTagD).append(tplTagAA);
          },
          useLegacyResolveConflicts: true,
          directConflictsPicks: ["right"],
        }))
      ).toMatchObject({
        status: "needs-resolution",
        specialDirectConflicts: [
          {
            conflictType: "special",
            objectType: "components",
            conflictParts: ["tplTree"],
            objectInsts: [shallow(leftSubject), shallow(rightSubject)],
          },
        ],
      });

      expect(
        (
          (
            (res.mergedSite.components[0].tplTree as TplTag)
              .children as TplTag[]
          ).find((tag) => tag.name === "D")?.children as TplTag[]
        )
          .slice(-1)
          .map((tag) => tag.name)
      ).toEqual(["AA"]);
    });

    it("merges insertions of new different components", () => {
      expect(
        testMerge({
          ancestorSite: singleComponentSite(),
          a: (site, tplMgr) => {
            tplMgr.addComponent({
              name: "a",
              type: ComponentType.Page,
            });
          },
          b: (site, tplMgr) => {
            tplMgr.addComponent({
              name: "b",
              type: ComponentType.Plain,
            });
          },
        })
      ).toMatchObject({
        status: "merged",
        mergedSite: {
          components: [{ name: "My page" }, { name: "a" }, { name: "b" }],
        },
      });
    });

    it("merges insertions of new tpls to same location", () => {
      expect(
        testMerge({
          ancestorSite: singleComponentSite(),
          a: (site) => {
            $$$(site.components[0].tplTree).append(
              mkTplTagX("div", {
                baseVariant: getBaseVariant(site.components[0]),
                variants: [
                  mkVariantSetting({
                    variants: [getBaseVariant(site.components[0])],
                  }),
                ],
              })
            );
          },
          b: (site) => {
            $$$(site.components[0].tplTree).append(
              mkTplTagX("div", {
                baseVariant: getBaseVariant(site.components[0]),
                variants: [
                  mkVariantSetting({
                    variants: [getBaseVariant(site.components[0])],
                  }),
                ],
              })
            );
          },
        })
      ).toMatchObject({
        status: "merged",
        mergedSite: {
          components: [
            {
              tplTree: {
                children: [
                  {
                    tag: "div",
                  },
                  {
                    tag: "div",
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it("merges swapping of tpl locations on one side", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            let tplTagA;
            flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
              (tpl) => {
                if (isKnownTplTag(tpl) && tpl.name === "A") {
                  tplTagA = tpl;
                }
              }
            );
            // Swap A1 and A2
            const indexA1 = tplTagA.children.findIndex(
              (tpl) => isKnownTplTag(tpl) && tpl.name === "A1"
            );
            assert(
              tplTagA.children[indexA1 + 1].name === "A2",
              () => `Expected A2 but got ${tplTagA.children[indexA1 + 1].name}`
            );
            tplTagA.children[indexA1] = tplTagA.children.splice(
              indexA1 + 1,
              1,
              tplTagA.children[indexA1]
            )[0];
          },
          b: () => {},
        })
      ).toMatchObject({
        status: "merged",
      });
    });

    it("merges identical swapping of tpl locations", () => {
      expect(
        testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            let tplTagA;
            flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
              (tpl) => {
                if (isKnownTplTag(tpl) && tpl.name === "A") {
                  tplTagA = tpl;
                }
              }
            );
            // Swap A1 and A2
            const indexA1 = tplTagA.children.findIndex(
              (tpl) => isKnownTplTag(tpl) && tpl.name === "A1"
            );
            assert(
              tplTagA.children[indexA1 + 1].name === "A2",
              () => `Expected A2 but got ${tplTagA.children[indexA1 + 1].name}`
            );
            tplTagA.children[indexA1] = tplTagA.children.splice(
              indexA1 + 1,
              1,
              tplTagA.children[indexA1]
            )[0];
          },
          b: (site) => {
            let tplTagA;
            flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
              (tpl) => {
                if (isKnownTplTag(tpl) && tpl.name === "A") {
                  tplTagA = tpl;
                }
              }
            );
            // Swap A1 and A2
            const indexA1 = tplTagA.children.findIndex(
              (tpl) => isKnownTplTag(tpl) && tpl.name === "A1"
            );
            assert(
              tplTagA.children[indexA1 + 1].name === "A2",
              () => `Expected A2 but got ${tplTagA.children[indexA1 + 1].name}`
            );
            tplTagA.children[indexA1] = tplTagA.children.splice(
              indexA1 + 1,
              1,
              tplTagA.children[indexA1]
            )[0];
          },
        })
      ).toMatchObject({
        status: "merged",
      });
    });

    it("conflicts on swapping of nodes that results in different orders", () => {
      expect(
        (res = testMerge({
          ancestorSite: basicSite(),
          a: (site) => {
            let tplTagA;
            flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
              (tpl) => {
                if (isKnownTplTag(tpl) && tpl.name === "A") {
                  tplTagA = tpl;
                }
              }
            );
            // Swap A1 and A2
            const indexA1 = tplTagA.children.findIndex(
              (tpl) => isKnownTplTag(tpl) && tpl.name === "A1"
            );
            assert(
              tplTagA.children[indexA1 + 1].name === "A2",
              () => `Expected A2 but got ${tplTagA.children[indexA1 + 1].name}`
            );
            tplTagA.children[indexA1] = tplTagA.children.splice(
              indexA1 + 1,
              1,
              tplTagA.children[indexA1]
            )[0];
          },
          b: (site) => {
            let tplTagA;
            flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
              (tpl) => {
                if (isKnownTplTag(tpl) && tpl.name === "A") {
                  tplTagA = tpl;
                }
              }
            );
            // Swap A2 and A3
            const indexA2 = tplTagA.children.findIndex(
              (tpl) => isKnownTplTag(tpl) && tpl.name === "A2"
            );
            assert(
              tplTagA.children[indexA2 + 1].name === "A3",
              () => `Expected A3 but got ${tplTagA.children[indexA2 + 1].name}`
            );
            tplTagA.children[indexA2] = tplTagA.children.splice(
              indexA2 + 1,
              1,
              tplTagA.children[indexA2]
            )[0];
          },
          useLegacyResolveConflicts: true,
          directConflictsPicks: ["right"],
        }))
      ).toMatchObject({
        status: "needs-resolution",
      });

      expect(
        (
          (
            (res.mergedSite.components[0].tplTree as TplTag)
              .children[0] as TplTag
          ).children as TplTag[]
        ).map((x) => x.name)
      ).toEqual(["AA", "A1", "A3", "A2", "A4"]);
    });

    it("resolve conflicts on swapping of nodes that results in different orders - pick left", () => {
      const { mergedSite } = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          let tplTagA;
          flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
            (tpl) => {
              if (isKnownTplTag(tpl) && tpl.name === "A") {
                tplTagA = tpl;
              }
            }
          );
          // Swap A1 and A2
          const indexA1 = tplTagA.children.findIndex(
            (tpl) => isKnownTplTag(tpl) && tpl.name === "A1"
          );
          assert(
            tplTagA.children[indexA1 + 1].name === "A2",
            () => `Expected A2 but got ${tplTagA.children[indexA1 + 1].name}`
          );
          tplTagA.children[indexA1] = tplTagA.children.splice(
            indexA1 + 1,
            1,
            tplTagA.children[indexA1]
          )[0];
        },
        b: (site) => {
          let tplTagA;
          flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
            (tpl) => {
              if (isKnownTplTag(tpl) && tpl.name === "A") {
                tplTagA = tpl;
              }
            }
          );
          // Swap A2 and A3
          const indexA2 = tplTagA.children.findIndex(
            (tpl) => isKnownTplTag(tpl) && tpl.name === "A2"
          );
          assert(
            tplTagA.children[indexA2 + 1].name === "A3",
            () => `Expected A3 but got ${tplTagA.children[indexA2 + 1].name}`
          );
          tplTagA.children[indexA2] = tplTagA.children.splice(
            indexA2 + 1,
            1,
            tplTagA.children[indexA2]
          )[0];
        },
        directConflictsPicks: ["left"],
        useLegacyResolveConflicts: true,
      });
      let tplTagA;
      flattenTpls((leftSubject = mergedSite.components[0]).tplTree).forEach(
        (tpl) => {
          if (isKnownTplTag(tpl) && tpl.name === "A") {
            tplTagA = tpl;
          }
        }
      );
      const childrenNames = tplTagA.children
        .map((child) => child.name)
        .filter((childName) => ["A1", "A2", "A3"].includes(childName));
      expect(childrenNames).toEqual(["A2", "A1", "A3"]);
    });

    it("resolve conflicts on swapping of nodes that results in different orders - pick right", () => {
      const { mergedSite } = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          let tplTagA;
          flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
            (tpl) => {
              if (isKnownTplTag(tpl) && tpl.name === "A") {
                tplTagA = tpl;
              }
            }
          );
          // Swap A1 and A2
          const indexA1 = tplTagA.children.findIndex(
            (tpl) => isKnownTplTag(tpl) && tpl.name === "A1"
          );
          assert(
            tplTagA.children[indexA1 + 1].name === "A2",
            () => `Expected A2 but got ${tplTagA.children[indexA1 + 1].name}`
          );
          tplTagA.children[indexA1] = tplTagA.children.splice(
            indexA1 + 1,
            1,
            tplTagA.children[indexA1]
          )[0];
        },
        b: (site) => {
          let tplTagA;
          flattenTpls((leftSubject = site.components[0]).tplTree).forEach(
            (tpl) => {
              if (isKnownTplTag(tpl) && tpl.name === "A") {
                tplTagA = tpl;
              }
            }
          );
          // Swap A2 and A3
          const indexA2 = tplTagA.children.findIndex(
            (tpl) => isKnownTplTag(tpl) && tpl.name === "A2"
          );
          assert(
            tplTagA.children[indexA2 + 1].name === "A3",
            () => `Expected A3 but got ${tplTagA.children[indexA2 + 1].name}`
          );
          tplTagA.children[indexA2] = tplTagA.children.splice(
            indexA2 + 1,
            1,
            tplTagA.children[indexA2]
          )[0];
        },
        directConflictsPicks: ["right"],
        useLegacyResolveConflicts: true,
      });
      let tplTagA;
      flattenTpls((leftSubject = mergedSite.components[0]).tplTree).forEach(
        (tpl) => {
          if (isKnownTplTag(tpl) && tpl.name === "A") {
            tplTagA = tpl;
          }
        }
      );
      const childrenNames = tplTagA.children
        .map((child) => child.name)
        .filter((childName) => ["A1", "A2", "A3"].includes(childName));
      expect(childrenNames).toEqual(["A1", "A3", "A2"]);
    });
  });

  it("merges swapping of tpl locations for tpl component args", () => {
    res = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        const comp = ensure(
          site.components.find((c) => c.name === "InstantiateSlotArgs"),
          () => "Couldn't find InstantiateSlotArgs"
        );
        let tplComp: TplComponent = undefined as any;
        flattenTpls(comp.tplTree).forEach((tpl) => {
          if (isKnownTplComponent(tpl) && tpl.name === "tplComp") {
            tplComp = tpl;
          }
        });
        const slot2 = ensure(
          $$$(tplComp).getSlotArg("slot2"),
          () => `No slot arg for slot2`
        );
        const baseVariant = getBaseVariant(comp);
        const [node2, node3] = ensureKnownRenderExpr(slot2.expr).tpl;
        ensureKnownRenderExpr(slot2.expr).tpl = [node3, node2];
        ensureKnownRenderExpr(slot2.expr).tpl.unshift(
          mkTplTagX("div", {
            name: "prepend",
            baseVariant,
            variants: [mkVariantSetting({ variants: [baseVariant] })],
          })
        );
        ensureKnownRenderExpr(slot2.expr).tpl.push(
          mkTplTagX("div", {
            name: "append",
            baseVariant,
            variants: [mkVariantSetting({ variants: [baseVariant] })],
          })
        );
        tplChildren(tplComp).forEach((child) => (child.parent = tplComp));
      },
      b: (site) => {
        const comp = ensure(
          site.components.find((c) => c.name === "InstantiateSlotArgs"),
          () => "Couldn't find InstantiateSlotArgs"
        );
        let tplComp: TplComponent = undefined as any;
        flattenTpls(comp.tplTree).forEach((tpl) => {
          if (isKnownTplComponent(tpl) && tpl.name === "tplComp") {
            tplComp = tpl;
          }
        });
        const slot1 = ensure(
          $$$(ensure(tplComp, () => `tplComp is undefined`)).getSlotArg(
            "slot1"
          ),
          () => `No slot arg for slot1`
        );
        const slot2 = ensure(
          $$$(tplComp).getSlotArg("slot2"),
          () => `No slot arg for slot2`
        );
        const [node1] = ensureKnownRenderExpr(slot1.expr).tpl;
        const [node2, node3] = ensureKnownRenderExpr(slot2.expr).tpl;
        // Re-order args
        ensureKnownRenderExpr(slot1.expr).tpl = [node3, node1];
        ensureKnownRenderExpr(slot2.expr).tpl = [node2];
      },
      directConflictsPicks: ["right"],
    });
    expect(res).toMatchObject({
      status: "needs-resolution",
    });
    const { mergedSite } = res;
    const comp = ensure(
      mergedSite.components.find((c) => c.name === "InstantiateSlotArgs"),
      () => "Couldn't find InstantiateSlotArgs"
    );
    let tplComp: TplComponent = undefined as any;
    flattenTpls(comp.tplTree).forEach((tpl) => {
      if (isKnownTplComponent(tpl) && tpl.name === "tplComp") {
        tplComp = tpl;
      }
    });
    const slot1 = ensure(
      $$$(ensure(tplComp, () => `tplComp is undefined`)).getSlotArg("slot1"),
      () => `No slot arg for slot1`
    );
    const slot2 = ensure(
      $$$(tplComp).getSlotArg("slot2"),
      () => `No slot arg for slot2`
    );
    expect(
      ensureKnownRenderExpr(slot1.expr).tpl.map((tpl) => (tpl as any).name)
    ).toEqual(["SlotArgNode3", "SlotArgNode1"]);
    expect(
      ensureKnownRenderExpr(slot2.expr).tpl.map((tpl) => (tpl as any).name)
    ).toEqual(["prepend", "SlotArgNode2", "append"]);
  });
  it("merges default slot contents and updates virtual slot arg", () => {
    res = testMerge({
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
    expect(res).toMatchObject({
      status: "merged",
    });
    const { mergedSite } = res;
    const comp = ensure(
      mergedSite.components.find((c) => c.name === "InstantiateSlotArgs"),
      () => "Couldn't find InstantiateSlotArgs"
    );
    let tplComp2: TplComponent = undefined as any;
    flattenTpls(comp.tplTree).forEach((tpl) => {
      if (isKnownTplComponent(tpl) && tpl.name === "tplComp2") {
        tplComp2 = tpl;
      }
    });
    const slot1 = ensure(
      $$$(ensure(tplComp2, () => `tplComp2 is undefined`)).getSlotArg("slot1"),
      () => `No slot arg for slot1`
    );
    expect(
      ensureKnownVirtualRenderExpr(slot1.expr).tpl.map(
        (tpl) => (tpl as any).name
      )
    ).toMatchObject(["prepend", "defaultContent", "append"]);
  });
  it("Can move tpl into slot of a new TplComponent", () => {
    res = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        // Just adds a new tpl to `InstantiateSlotArgs`
        const comp = ensure(
          site.components.find((c) => c.name === "InstantiateSlotArgs"),
          () => "Couldn't find InstantiateSlotArgs"
        );
        const baseVariant = getBaseVariant(comp);
        $$$(comp.tplTree).append(
          mkTplTagX("div", {
            name: "append",
            baseVariant,
            variants: [mkVariantSetting({ variants: [baseVariant] })],
          })
        );
      },
      b: (site) => {
        // Moves `tplComp2` into `newTplComp`
        const hasSlots = ensure(
          site.components.find((c) => c.name === "HasSlots"),
          () => "Couldn't find InstantiateSlotArgs"
        );
        const comp = ensure(
          site.components.find((c) => c.name === "InstantiateSlotArgs"),
          () => "Couldn't find InstantiateSlotArgs"
        );
        const instantiateSlotArgsBaseVariant = getBaseVariant(comp);
        $$$(comp.tplTree).prepend(
          mkTplComponentX({
            name: "newTplComp",
            baseVariant: instantiateSlotArgsBaseVariant,
            component: hasSlots,
            args: {
              slot1: new RenderExpr({
                tpl: [
                  mkTplTagX("div", {
                    name: "NewSlotArgNode",
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
        let tplComp: TplComponent = undefined as any;
        flattenTpls(comp.tplTree).forEach((tpl) => {
          if (isKnownTplComponent(tpl) && tpl.name === "newTplComp") {
            tplComp = tpl;
          }
        });
        let tplComp2: TplComponent = undefined as any;
        flattenTpls(comp.tplTree).forEach((tpl) => {
          if (isKnownTplComponent(tpl) && tpl.name === "tplComp2") {
            tplComp2 = tpl;
          }
        });
        const slot1 = ensure(
          $$$(ensure(tplComp, () => `tplComp is undefined`)).getSlotArg(
            "slot1"
          ),
          () => `No slot arg for slot1`
        );

        $$$(tplComp2).remove({ deep: true });
        $$$(tplComp).updateSlotArgForParam(
          slot1.param,
          (arg) => ({
            newChildren: [ensure(tplComp2, () => `tplComp2 is undefined`)],
            updateArg: () => {
              ensureKnownRenderExpr(arg.expr).tpl.push(tplComp2);
            },
          }),
          { deepRemove: false }
        );
      },
    });
    expect(res).toMatchObject({
      status: "merged",
    });
    const { mergedSite } = res;
    const comp = ensure(
      mergedSite.components.find((c) => c.name === "InstantiateSlotArgs"),
      () => "Couldn't find InstantiateSlotArgs"
    );
    let tplComp: TplComponent = undefined as any;
    flattenTpls(comp.tplTree).forEach((tpl) => {
      if (isKnownTplComponent(tpl) && tpl.name === "newTplComp") {
        tplComp = tpl;
      }
    });
    expect(
      tplChildren(comp.tplTree).map(
        (tpl) => (tpl as TplComponent | TplTag).name
      )
    ).toEqual(["newTplComp", "tplComp", "append"]);
    const slot1 = ensure(
      $$$(ensure(tplComp, () => `tplComp is undefined`)).getSlotArg("slot1"),
      () => `No slot arg for slot1`
    );
    expect(
      ensureKnownRenderExpr(slot1.expr).tpl.map(
        (tpl) => (tpl as TplComponent | TplTag).name
      )
    ).toEqual(["NewSlotArgNode", "tplComp2"]);
  });
  it("Handles re-rooting with no conflict", () => {
    expect(
      (res = testMerge({
        ancestorSite: basicSite(),
        a: (site) => {
          const comp = site.components[0];
          const oldRoot = comp.tplTree as TplTag | TplComponent;
          oldRoot.name = "oldRoot";
        },
        b: (site) => {
          const comp = site.components[0];
          trackComponentRoot(comp);
          trackComponentSite(comp, site);
          const oldRoot = comp.tplTree as TplTag | TplComponent;
          oldRoot.name = "oldRoot";
          const baseVariant = getBaseVariant(comp);
          const newRoot = mkTplTagX("div", {
            name: "rightRoot",
            baseVariant,
            variants: [mkVariantSetting({ variants: [baseVariant] })],
          });
          $$$(oldRoot).wrap(newRoot);
          $$$(oldRoot).detach();
          $$$(newRoot).append(oldRoot);
        },
      }))
    ).toMatchObject({
      status: "merged",
    });
    expect(ensureKnownTplTag(res.mergedSite.components[0].tplTree).name).toBe(
      "rightRoot"
    );
    expect(
      $$$(res.mergedSite.components[0].tplTree)
        .children()
        .toArray()
        .map((tpl) => (tpl as any).name)
    ).toMatchObject(["oldRoot"]);
  });
  it("merges conflict re-rooting the component", () => {
    res = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        const comp = site.components[0];
        trackComponentRoot(comp);
        trackComponentSite(comp, site);
        const oldRoot = comp.tplTree as TplTag | TplComponent;
        oldRoot.name = "oldRoot";
        const baseVariant = getBaseVariant(comp);
        const newRoot = mkTplTagX("div", {
          name: "leftRoot",
          baseVariant,
          variants: [mkVariantSetting({ variants: [baseVariant] })],
        });
        $$$(oldRoot).wrap(newRoot);
        $$$(oldRoot).detach();
        $$$(newRoot).append(oldRoot);
      },
      b: (site) => {
        const comp = site.components[0];
        trackComponentRoot(comp);
        trackComponentSite(comp, site);
        const oldRoot = comp.tplTree as TplTag | TplComponent;
        oldRoot.name = "oldRoot";
        const baseVariant = getBaseVariant(comp);
        const newRoot = mkTplTagX("div", {
          name: "rightRoot",
          baseVariant,
          variants: [mkVariantSetting({ variants: [baseVariant] })],
        });
        $$$(oldRoot).wrap(newRoot);
        $$$(oldRoot).detach();
        $$$(newRoot).append(oldRoot);
      },
      directConflictsPicks: ["left"],
    });
    expect(ensureKnownTplTag(res.mergedSite.components[0].tplTree).name).toBe(
      "leftRoot"
    );
    expect(
      $$$(res.mergedSite.components[0].tplTree)
        .children()
        .toArray()
        .map((tpl) => (tpl as any).name)
    ).toMatchObject(["oldRoot"]);
  });
  it("Name collisions with code components, props and normal components", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(codeComponentsWithSameNameBundle)
    );
    expect(result).toMatchObject({
      status: "merged",
    });
    const merged = result.mergedSite;
    const page = ensure(
      merged.components.find((c) => c.name === "Page"),
      () => "Couldn't find Page"
    );
    const children = tplChildren(page.tplTree);
    expect(children.length).toBe(5);
    expect(
      merged.components.filter(
        (c) => c.name.startsWith("Comp") && !!c.codeComponentMeta
      ).length
    ).toBe(1);
    expect(
      merged.components.find((c) => c.name === "Comp" && !!c.codeComponentMeta)
        ?.params.length
    ).toBe(1);
    expect(
      merged.components.filter((c) => c.name === "Comp" && !c.codeComponentMeta)
        .length
    ).toBe(1);
    expect(
      merged.components.filter(
        (c) => c.name === "Comp 2" && !c.codeComponentMeta
      ).length
    ).toBe(1);
    const comp1 = children.find(
      (child) => isKnownTplComponent(child) && child.name === "comp1"
    );
    const comp2 = children.find(
      (child) => isKnownTplComponent(child) && child.name === "comp2"
    );
    const comp3 = children.find(
      (child) => isKnownTplComponent(child) && child.name === "comp3"
    );
    const plasmicComp1 = children.find(
      (child) => isKnownTplComponent(child) && child.name === "plasmicComp1"
    );
    const plasmicComp2 = children.find(
      (child) => isKnownTplComponent(child) && child.name === "plasmicComp2"
    );
    expect(comp1).toBeTruthy();
    expect(comp2).toBeTruthy();
    expect(comp3).toBeTruthy();
    expect(plasmicComp1).toBeTruthy();
    expect(plasmicComp2).toBeTruthy();
    expect(
      asCode(comp1?.vsettings[0].args[0]?.expr as any, {
        projectFlags: getProjectFlags(merged),
        component: page,
        inStudio: true,
      }).code
    ).toContain("arg1");
    expect(
      asCode(comp2?.vsettings[0].args[0]?.expr as any, {
        projectFlags: getProjectFlags(merged),
        component: page,
        inStudio: true,
      }).code
    ).toContain("arg2");
    expect(
      asCode(comp3?.vsettings[0].args[0]?.expr as any, {
        projectFlags: getProjectFlags(merged),
        component: page,
        inStudio: true,
      }).code
    ).toContain("arg3");
    expect(
      [comp1, comp2, comp3].map(
        (tpl) => tpl!.vsettings[0].args[0].param.variable.name
      )
    ).toEqual(["param1", "param1", "param1"]);
    expect(
      asCode(plasmicComp1?.vsettings[0].args[0]?.expr as any, {
        projectFlags: getProjectFlags(merged),
        component: page,
        inStudio: true,
      }).code
    ).toContain("plasmicArg1");
    expect(
      asCode(plasmicComp2?.vsettings[0].args[0]?.expr as any, {
        projectFlags: getProjectFlags(merged),
        component: page,
        inStudio: true,
      }).code
    ).toContain("plasmicArg2");
  });
  it("Test tpl tree operations", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(mergeTplsBundle)
    );
    expect(result).toMatchObject({
      status: "merged",
    });
    const site = result.mergedSite;
    const findComp = (name: string) =>
      ensure(
        site.components.find((c) => c.name === name),
        () => `Couldn't find component ${name}`
      );
    const findFrame = (name: string) =>
      ensure(
        site.arenas[0].children.find((f) => f.name === name),
        () => `Couldn't find artboard ${name}`
      );
    const mainFrameComp = findFrame("mainArtboard").container.component;

    const findTpl = (name: string, comp: Component = mainFrameComp) =>
      ensure(
        flattenTpls(comp.tplTree).find((tpl) => (tpl as any).name === name),
        () => `Couldn't find tpl ${name} in component ${comp.name}`
      );

    const childrenNames = (tpl: TplNode) =>
      $$$(tpl)
        .children()
        .toArray()
        .map((child) => (child as any).name);
    {
      const comp = findComp("Section1Comp");
      const childrenSlot = ensure(
        flattenTpls(comp.tplTree).find((tpl) => isKnownTplSlot(tpl)) as TplSlot,
        () => `Couldn't find any tpl slot`
      );
      expect(childrenNames(childrenSlot)).toMatchObject([null]);
      const oldContent = findTpl("oldDefaultContent", comp);
      expect((oldContent.parent as any)?.name).toBe("tplTag");
    }
    {
      const section2 = findTpl("section2");
      const section2TplComp = ensure(
        flattenTpls(section2).find(
          (tpl) =>
            isKnownTplComponent(tpl) && tpl.component.name === "Section2Comp"
        ),
        () => `Found no instance of Section2Comp`
      );
      expect($$$(section2TplComp).children().length()).toBe(0);
      const tpl = findTpl("section2TplTag");
      expect(childrenNames(tpl)).toMatchObject(["oldArg"]);
    }
    {
      const cycle1 = findTpl("cycle1");
      const cycle2 = findTpl("cycle2");
      assert(
        cycle1.parent === cycle2 || cycle2.parent === cycle1,
        () => `Expected cycle to have been flattened`
      );
    }
    {
      const section4comp = findTpl("section4comp");
      expect($$$(section4comp).children().length()).toBe(0);
    }
    {
      const section5comp = findTpl("section5comp");
      expect(sorted(childrenNames(section5comp))).toMatchObject([
        "child1",
        "child2",
        "child3",
      ]);
      expect(childrenNames(section5comp)[0]).toBe("child1");
      assert(
        isKnownVirtualRenderExpr(
          $$$(section5comp).getSlotArg("children")?.expr
        ),
        () => `Didn't preserve VirtualRenderExpr`
      );
    }
    {
      const section6comp = findTpl("section6comp");
      expect(childrenNames(section6comp)).toMatchObject([
        "section6order3",
        "section6order1",
        "section6order2",
        "section6order4",
      ]);
    }
    {
      const section7 = findTpl("section7");
      expect(
        childrenNames(
          only(
            ensureKnownRenderExpr($$$(section7).getSlotArg("children")?.expr)
              .tpl
          )
        )
      ).toMatchObject([
        "section7order3",
        "section7order1",
        "section7order2",
        "section7order4",
      ]);
    }
    {
      const newArtboard = findFrame("newartboard");
      expect(
        newArtboard.targetGlobalVariants.map((variant) => variant.name)
      ).toMatchObject(["Mobile"]);
    }
    {
      assert(
        !!swallow(() => findFrame("section10arena1")) ||
          !!swallow(() => findFrame("section10arena2")),
        () =>
          `Couldn't find artboard section10arena after a harmless conflict renaming it`
      );
    }
  });
  it("Test merging project deps", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(mergeDepsBundle)
    );
    expect(result).toMatchObject({
      status: "merged",
    });
    const site = result.mergedSite;
    const mainArtboardComp = only(only(site.arenas).children).container
      .component;
    const findTpl = (name: string) =>
      ensure(
        flattenTpls(mainArtboardComp.tplTree).find(
          (tpl) => (tpl as any).name === name
        ),
        () => `Couldn't find tpl ${name}`
      );
    {
      // Add new dep
      const dep = only(
        site.projectDependencies.filter((d) => d.name === "section-1-dep")
      );
      const container = findTpl("section1container");
      const child = ensureKnownTplComponent(
        only(ensureKnownTplTag(container).children)
      );
      expect(child.name).toBe("section1comp");
      expect(child.component.name).toBe("Section1Comp");
      expect(dep.site.components).toContain(child.component);
    }
    {
      // Remove dep
      expect(site.projectDependencies.map((dep) => dep.name)).not.toContain(
        "section-2-dep"
      );
      const container = findTpl("section2container");
      const children = ensureKnownTplTag(container).children.map((child) =>
        ensureKnownTplComponent(child)
      );
      expect(children.map((child) => child.name)).toMatchObject([
        "section2comp1",
        "section2comp2",
      ]);
      assert(
        children.every((tpl) => site.components.includes(tpl.component)),
        () =>
          `Referencing component not in the site after deleting section-2-dep`
      );
      children.forEach((child) =>
        expect(child.component.name).toStartWith("Section2Comp")
      );
    }
    {
      // Upgrade dep in one branch and remove it in the other
      expect(site.projectDependencies.map((dep) => dep.name)).not.toContain(
        "section-3-dep"
      );
      const container = findTpl("section3container");
      const children = ensureKnownTplTag(container).children.map((child) =>
        ensureKnownTplComponent(child)
      );
      expect(children.map((child) => child.name)).toMatchObject([
        "section3comp1",
        "section3comp2",
      ]);
      assert(
        children.every((tpl) => site.components.includes(tpl.component)),
        () =>
          `Referencing component not in the site after deleting section-3-dep`
      );
      expect(children.map((child) => child.component.name)).toMatchObject([
        "Section3Comp",
        "Section3CompV2",
      ]);
    }
    {
      // Upgrade dep in both branches (same version)
      const dep = only(
        site.projectDependencies.filter((d) => d.name === "section-4-dep")
      );
      const container = findTpl("section4container");
      const child = ensureKnownTplComponent(
        only(ensureKnownTplTag(container).children)
      );
      expect(child.name).toBe("section4comp");
      expect(child.component.name).toBe("Section4CompV2");
      expect(dep.site.components).toContain(child.component);
    }
    {
      // Upgrade dep in both branches (different versions)
      const dep = only(
        site.projectDependencies.filter((d) => d.name === "section-5-dep")
      );
      const container = findTpl("section5container");
      const child = ensureKnownTplComponent(
        only(ensureKnownTplTag(container).children)
      );
      expect(child.name).toBe("section5comp");
      expect(child.component.name).toBe("Section5CompV3");
      expect(dep.site.components).toContain(child.component);
    }
    {
      // Add new dep in both branches (same version)
      const dep = only(
        site.projectDependencies.filter((d) => d.name === "section-6-dep")
      );
      const container = findTpl("section6container");
      const children = ensureKnownTplTag(container).children.map((child) =>
        ensureKnownTplComponent(child)
      );
      expect(sorted(children.map((child) => child.name))).toMatchObject([
        "section6comp1",
        "section6comp2",
      ]);
      children.forEach((child) => {
        expect(child.component.name).toBe("Section6Comp");
        expect(dep.site.components).toContain(child.component);
      });
    }
    {
      // Add new dep in both branches (different version)
      const dep = only(
        site.projectDependencies.filter((d) => d.name === "section-7-dep")
      );
      const container = findTpl("section7container");
      const children = ensureKnownTplTag(container).children.map((child) =>
        ensureKnownTplComponent(child)
      );
      expect(sorted(children.map((child) => child.name))).toMatchObject([
        "section7comp1",
        "section7comp2",
      ]);
      children.forEach((child) => {
        expect(child.component.name).toBe("Section7CompV2");
        expect(dep.site.components).toContain(child.component);
      });
    }
  });
  it("Regression tests and edge cases", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(edgeCasesBundle),
      ["right"]
    );
    expect(result).toMatchObject({
      status: "merged",
    });
    const site = result.mergedSite;
    const findComp = (name: string) =>
      ensure(
        site.components.find((c) => c.name === name),
        () => `Couldn't find component ${name}`
      );
    const findFrame = (name: string) =>
      ensure(
        site.arenas[0].children.find((f) => f.name === name),
        () => `Couldn't find artboard ${name}`
      );
    const mainFrameComp = findFrame("").container.component;
    const findTpl = (name: string, comp: Component = mainFrameComp) =>
      ensure(
        flattenTpls(comp.tplTree).find((tpl) => (tpl as any).name === name),
        () => `Couldn't find tpl ${name} in component ${comp.name}`
      );
    {
      const newArtboard = findFrame("newFrame");
      expect(Object.keys(newArtboard.pinnedGlobalVariants)).toMatchObject([
        ensure(
          site.globalVariantGroups.find(
            (group) => group.param.variable.name === "Mode"
          ),
          () => `Couldn't find Mode global variant group`
        ).variants[0].uuid,
      ]);
    }
    {
      const tpl1 = findTpl("section2codeComp1");
      const tpl2 = findTpl("section2codeComp2");
      expect(
        sorted(findComp("CodeComp").params.map((p) => p.variable.name))
      ).toMatchObject(["choiceParam", "param1"]);
      expect(
        asCode(only(only(tpl1.vsettings).args).expr, {
          projectFlags: getProjectFlags(site),
          component: mainFrameComp,
          inStudio: true,
        }).code
      ).toInclude("value1");
      expect(
        asCode(only(only(tpl2.vsettings).args).expr, {
          projectFlags: getProjectFlags(site),
          component: mainFrameComp,
          inStudio: true,
        }).code
      ).toInclude("value2");
      expect(only(only(tpl1.vsettings).args).param).toBe(
        only(only(tpl2.vsettings).args).param
      );
    }
    {
      const comp = findComp("Section3Comp");
      const slot = ensureKnownTplSlot(
        only(flattenTpls(comp.tplTree).filter((tpl) => isKnownTplSlot(tpl)))
      );
      expect(ensureKnownTplTag(only(slot.defaultContents)).name).toBe("tplTag");
    }
    {
      const tpl = findTpl("section4comp");
      expect(ensureKnownTplTag(only(tplChildren(tpl))).name).toBe(
        "section4tpl"
      );
    }
    {
      const tpl = findTpl("section5comp");
      expect(
        tplChildren(tpl).map((child) => ensureKnownTplTag(child).name)
      ).toMatchObject(["section5fstChild", "section5tpl", "section5lastChild"]);
    }
    {
      const comp = findComp("Section6Comp");
      expect(swallow(() => findTpl("tpl", comp))).toBe(null);
    }
    {
      expect(swallow(() => findTpl("section7tpl"))).toBe(null);
    }
    {
      const comp = findComp("Section8Comp1");
      const tpl = findTpl("section8comp2", comp);
      expect(
        asCode(only(tpl.vsettings[0].args).expr, {
          projectFlags: getProjectFlags(site),
          component: comp,
          inStudio: true,
        }).code
      ).toInclude("true");
    }
    {
      const comp = findComp("CodeComp");
      const param = comp.params.find((p) => p.variable.name === "choiceParam");
      const choiceType = ensureKnownChoice(param?.type);
      expect(choiceType.options).toMatchObject([
        {
          value: 1,
          label: "number one",
        },
        { value: true, label: "true" },
        { value: "str", label: "str" },
      ]);
    }
    {
      const tpl = findTpl("section10tpl");
      expect(
        asCode(tpl.vsettings[0].attrs.title, {
          projectFlags: getProjectFlags(site),
          component: mainFrameComp,
          inStudio: true,
        }).code
      ).toInclude("value2");
    }
    {
      const tpl1 = findTpl("section11container1");
      const tpl2 = findTpl("section11container2");
      const tpl = findTpl("section11tpl");
      expect(tpl.parent).toBe(tpl2);
      expect(tplChildren(tpl1).length).toBe(0);
      expect(tpl.vsettings[0].rs.values["width"]).toEqual("30px");
    }
    {
      const tpl1 = findTpl("section12comp1");
      const tpl2 = findTpl("section12comp2");
      expect(tplChildren(tpl1).length).toBe(0);
      expect(tplChildren(tpl2).length).toBe(0);
      expect(ensureKnownTplComponent(tpl1).component.params.length).toBe(0);
    }
    {
      const tpl = findTpl("section13comp");
      expect(
        tplChildren(tpl).map((child) => ensureKnownTplTag(child).name)
      ).toMatchObject(["section13tpl2", "section13tpl1", "section13newTpl"]);
    }
  });
  it("Regression tests and edge cases", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(edgeCasesBundle2)
    );
    expect(result).toMatchObject({
      status: "merged",
    });
    const site = result.mergedSite;
    const findFrame = (name: string) =>
      ensure(
        site.arenas[0].children.find((f) => f.name === name),
        () => `Couldn't find artboard ${name}`
      );
    const mainFrameComp = findFrame("mainFrame").container.component;
    const findComp = (name: string) =>
      ensure(
        site.components.find((c) => c.name === name),
        () => `Couldn't find component ${name}`
      );
    const findTpl = (name: string, comp: Component = mainFrameComp) =>
      ensure(
        flattenTpls(comp.tplTree).find((tpl) => (tpl as any).name === name),
        () => `Couldn't find tpl ${name} in component ${comp.name}`
      );
    {
      const tpl = findTpl("section1newTpl");
      expect(tplChildren(tpl).length).toBe(0);
      expect(swallow(() => findTpl("section1tpl"))).toBe(null);
    }
    {
      const tpl = findTpl("section2comp");
      expect(tplChildren(tpl).length).toBe(0);
      expect(swallow(() => findTpl("section2tpl"))).toBe(null);
    }
    {
      expect(swallow(() => findComp("Section3Comp1"))).toBe(null);
      expect(findComp("Section3Comp2").params.length).toBe(0);
      expect(swallow(() => findTpl("section3comp1"))).toBe(null);
      expect(swallow(() => findTpl("section3comp2"))).toBe(null);
      expect(swallow(() => findTpl("section3child"))).toBe(null);
    }
  });
  it("De-duplicates registered tokens, renames non-registered duplicated tokens", () => {
    const result = testMerge({
      ancestorSite: (() => {
        const site = basicSite({ tokens: {} });
        site.styleTokens.push(
          createStyleTokenFromRegistration({
            name: "registered-1",
            type: "line-height",
            value: "100",
          })
        );
        return site;
      })(),
      a: (site, tplMgr) => {
        site.styleTokens = [];
        tplMgr.addToken({
          name: "nonRegistered",
          tokenType: TokenType.LineHeight,
          value: "3",
        });
        ensureKnownTplTag(site.components[0].tplTree).vsettings[0].rs.values[
          "line-height"
        ] = mkTokenRef(site.styleTokens[0]);
        site.styleTokens.push(
          createStyleTokenFromRegistration({
            name: "registered-1",
            type: "font-size",
            value: "101",
          })
        );
        ensureKnownTplTag(site.components[0].tplTree).vsettings[0].rs.values[
          "font-size"
        ] = mkTokenRef(site.styleTokens[1]);
        site.styleTokens.push(
          createStyleTokenFromRegistration({
            name: "registered-2",
            type: "spacing",
            value: "102",
          })
        );
        ensureKnownTplTag(site.components[0].tplTree).vsettings[0].rs.values[
          "margin-top"
        ] = mkTokenRef(site.styleTokens[2]);
      },
      b: (site, tplMgr) => {
        site.styleTokens = [];
        tplMgr.addToken({
          name: "nonRegistered",
          tokenType: TokenType.LineHeight,
          value: "4",
        });
        ensureKnownTplTag(site.components[1].tplTree).vsettings[0].rs.values[
          "line-height"
        ] = mkTokenRef(site.styleTokens[0]);
        site.styleTokens.push(
          createStyleTokenFromRegistration({
            name: "registered-1",
            type: "font-size",
            value: "111",
          })
        );
        ensureKnownTplTag(site.components[1].tplTree).vsettings[0].rs.values[
          "font-size"
        ] = mkTokenRef(site.styleTokens[1]);
        site.styleTokens.push(
          createStyleTokenFromRegistration({
            name: "registered-2",
            type: "spacing",
            value: "112",
          })
        );
        ensureKnownTplTag(site.components[1].tplTree).vsettings[0].rs.values[
          "margin-top"
        ] = mkTokenRef(site.styleTokens[2]);
      },
    });
    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [
        {
          violation: "duplicate-names",
          origName: "nonRegistered",
          renamedTo: "nonRegistered 2",
        },
      ],
    });
    expect(
      sorted(result.mergedSite.styleTokens.map((t) => t.name))
    ).toMatchObject(
      sorted([
        "nonRegistered",
        "nonRegistered 2",
        "registered-1",
        "registered-2",
      ])
    );

    const props = ["line-height", "font-size", "margin-top"];
    const ruleValues = [
      ...props.map(
        (prop) =>
          result.mergedSite.components[0].tplTree.vsettings[0].rs.values[prop]
      ),
      ...props.map(
        (prop) =>
          result.mergedSite.components[1].tplTree.vsettings[0].rs.values[prop]
      ),
    ];
    const getTokenByName = (name: string) =>
      ensure(
        result.mergedSite.styleTokens.find((t) => t.name === name),
        () => `Couldn't find token ${name}`
      );
    const usedTokens = [
      getTokenByName("nonRegistered"),
      getTokenByName("registered-1"),
      getTokenByName("registered-2"),
      getTokenByName("nonRegistered 2"),
      getTokenByName("registered-1"),
      getTokenByName("registered-2"),
    ];
    expect(ruleValues).toMatchObject(usedTokens.map((t) => mkTokenRef(t)));
  });
  it("Handles page path conflicts", () => {
    const result = testMerge({
      ancestorSite: createSite(),
      a: (_site, tplMgr) => {
        const page = tplMgr.addComponent({
          name: "PageA",
          type: ComponentType.Page,
        });
        page.pageMeta!.path = "/new-page/[test1]";
      },
      b: (_site, tplMgr) => {
        const page = tplMgr.addComponent({
          name: "PageB",
          type: ComponentType.Page,
        });
        page.pageMeta!.path = "/new-page/[test2]";
      },
    });
    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [
        {
          violation: "duplicate-page-path",
        },
      ],
    });
    const pageA = result.mergedSite.components.find((c) => c.name === "PageA");
    const pageB = result.mergedSite.components.find((c) => c.name === "PageB");
    expect(pageA?.pageMeta?.path).toBe("/new-page-2/[test1]");
    expect(pageB?.pageMeta?.path).toBe("/new-page/[test2]");
  });
  it("Simple swap components test", () => {
    const result = testMerge({
      ancestorSite: (() => {
        const site = createSite();
        const tplMgr = new TplMgr({ site });
        const instantiatedComp = tplMgr.addComponent({
          name: "InstantiatedComp",
          type: ComponentType.Plain,
        });
        // Create component with prop / state and instantiate it
        const prop1 = mkParam({
          name: "prop1",
          type: typeFactory["any"](),
          paramType: "prop",
        });
        instantiatedComp.params.push(prop1);

        const parentComp = tplMgr.addComponent({
          name: "ParentComp",
          type: ComponentType.Plain,
        });
        const parentCompBaseVariant = getBaseVariant(parentComp);

        $$$(parentComp.tplTree).append(
          mkTplComponentX({
            name: "tplComp",
            baseVariant: parentCompBaseVariant,
            component: instantiatedComp,
            args: {
              prop1: codeLit("expr1"),
            },
          })
        );
        return site;
      })(),
      a: (site, tplMgr) => {
        // Swap with component, the prop arg should be preserved
        const newComp = tplMgr.addComponent({
          name: "NewComp",
          type: ComponentType.Plain,
        });
        const prop1 = mkParam({
          name: "prop1",
          type: typeFactory["any"](),
          paramType: "prop",
        });
        newComp.params.push(prop1);
        tplMgr.swapComponents(
          ensure(
            site.components.find((c) => c.name === "InstantiatedComp"),
            () => "Should have InstantiatedComp"
          ),
          newComp
        );
      },
      b: () => {},
    });
    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [],
    });
    expect(
      ensureKnownTplComponent(
        ensureKnownTplTag(
          result.mergedSite.components.find((c) => c.name === "ParentComp")!
            .tplTree
        ).children[0]
      ).vsettings[0].args.map((arg) => ensureKnownCustomCode(arg.expr).code)
    ).toMatchObject(['"expr1"']);
  });
  it("Handles swapping components", () => {
    const result = testMerge({
      ancestorSite: (() => {
        const site = createSite();
        const tplMgr = new TplMgr({ site });
        const instantiatedComp = tplMgr.addComponent({
          name: "InstantiatedComp",
          type: ComponentType.Plain,
        });
        // Create component with prop / state and instantiate it
        const prop1 = mkParam({
          name: "prop1",
          type: typeFactory["any"](),
          paramType: "prop",
        });
        instantiatedComp.params.push(prop1);

        const parentComp = tplMgr.addComponent({
          name: "ParentComp",
          type: ComponentType.Plain,
        });
        const parentCompBaseVariant = getBaseVariant(parentComp);

        $$$(parentComp.tplTree).append(
          mkTplComponentX({
            name: "tplComp",
            baseVariant: parentCompBaseVariant,
            component: instantiatedComp,
            args: {
              prop1: codeLit("expr1"),
            },
          })
        );

        const { valueParam, onChangeParam } = mkParamsForState({
          name: "state1",
          onChangeProp: "On state1 change",
          variableType: "text",
          accessType: "writable",
          defaultExpr: codeLit("hello"),
        });
        const state = mkState({
          param: valueParam,
          onChangeParam,
          variableType: "text",
          accessType: "writable",
        });
        addComponentState(site, instantiatedComp, state);
        return site;
      })(),
      a: (site, tplMgr) => {
        // Swap with component with new props and with implicit state
        const newComp = tplMgr.addComponent({
          name: "NewComp",
          type: ComponentType.Plain,
        });
        const prop1 = mkParam({
          name: "prop1",
          type: typeFactory["any"](),
          paramType: "prop",
        });
        const prop2 = mkParam({
          name: "prop2",
          type: typeFactory["any"](),
          paramType: "prop",
        });
        newComp.params.push(prop1, prop2);
        tplMgr.swapComponents(
          ensure(
            site.components.find((c) => c.name === "InstantiatedComp"),
            () => "Should have InstantiatedComp"
          ),
          newComp
        );
        const tplComp = ensureKnownTplComponent(
          ensureKnownTplTag(
            site.components.find((c) => c.name === "ParentComp")!.tplTree
          ).children[0]
        );
        tplComp.vsettings[0].args.push(
          new Arg({
            expr: codeLit("expr2"),
            param: prop2,
          })
        );
        const { valueParam, onChangeParam } = mkParamsForState({
          name: "state2",
          onChangeProp: "On state2 change",
          variableType: "text",
          accessType: "writable",
          defaultExpr: codeLit("hello"),
        });
        const state = mkState({
          param: valueParam,
          onChangeParam,
          variableType: "text",
          accessType: "writable",
        });
        addComponentState(site, newComp, state);
      },
      b: (site) => {
        // Add new params and implicit states
        const instantiated = site.components.find(
          (c) => c.name === "InstantiatedComp"
        )!;
        const prop2 = mkParam({
          name: "prop2",
          type: typeFactory["any"](),
          paramType: "prop",
        });
        instantiated.params.push(prop2);
        const tplComp = ensureKnownTplComponent(
          ensureKnownTplTag(
            site.components.find((c) => c.name === "ParentComp")!.tplTree
          ).children[0]
        );
        tplComp.vsettings[0].args.push(
          new Arg({
            expr: codeLit("expr3"),
            param: prop2,
          })
        );
        const { valueParam, onChangeParam } = mkParamsForState({
          name: "state3",
          onChangeProp: "On state3 change",
          variableType: "text",
          accessType: "writable",
          defaultExpr: codeLit("hello"),
        });
        const state = mkState({
          param: valueParam,
          onChangeParam,
          variableType: "text",
          accessType: "writable",
        });
        addComponentState(site, instantiated, state);
      },
    });
    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [],
    });
    expect(
      ensureKnownTplComponent(
        ensureKnownTplTag(
          result.mergedSite.components.find((c) => c.name === "ParentComp")!
            .tplTree
        ).children[0]
      ).vsettings[0].args.map((arg) => ensureKnownCustomCode(arg.expr).code)
    ).toMatchObject(['"expr1"', '"expr2"']);
    expect(
      result.mergedSite.components
        .find((c) => c.name === "ParentComp")!
        .states.map((state) => state.implicitState?.param.variable.name)
    ).toMatchObject(["state2"]);
  });
  it("Handles the same expression moved to two different places in the tree", () => {
    const rez = testMerge({
      ancestorSite: (() => {
        const site = basicSite();
        site.components[0].tplTree.vsettings[0].attrs["id"] = codeLit("expr1");
        return site;
      })(),
      a: (site) => {
        site.components[1].tplTree.vsettings[0].attrs["id"] =
          site.components[0].tplTree.vsettings[0].attrs["id"];
        delete site.components[0].tplTree.vsettings[0].attrs["id"];
      },
      b: (site) => {
        site.components[2].tplTree.vsettings[0].attrs["id"] =
          site.components[0].tplTree.vsettings[0].attrs["id"];
        delete site.components[0].tplTree.vsettings[0].attrs["id"];
      },
    });
    expect(rez).toMatchObject({
      status: "merged",
      autoReconciliations: [],
    });
    expect(rez.mergedSite.components[0].tplTree.vsettings[0].attrs["id"]).toBe(
      undefined
    );
    expect(
      ensureKnownCustomCode(
        rez.mergedSite.components[1].tplTree.vsettings[0].attrs["id"]
      ).code
    ).toBe('"expr1"');
    expect(
      ensureKnownCustomCode(
        rez.mergedSite.components[2].tplTree.vsettings[0].attrs["id"]
      ).code
    ).toBe('"expr1"');
  });
  it("Swap component with virtual slot args", () => {
    const result = testMerge({
      ancestorSite: (() => {
        const site = createSite();
        const tplMgr = new TplMgr({ site });
        const instantiatedComp = tplMgr.addComponent({
          name: "InstantiatedComp",
          type: ComponentType.Plain,
        });
        const slotParam = addSlotParam(site, instantiatedComp, "slot");
        const instantiatedBaseVariant = getBaseVariant(instantiatedComp);
        const tplSlot = mkSlot(slotParam, [
          mkTplTagX("div", {
            name: "defaultContent",
            baseVariant: instantiatedBaseVariant,
            variants: [
              mkVariantSetting({ variants: [instantiatedBaseVariant] }),
            ],
          }),
        ]);
        tplSlot.vsettings = [
          mkVariantSetting({ variants: [instantiatedBaseVariant] }),
        ];
        $$$(instantiatedComp.tplTree).append(tplSlot);

        const parentComp = tplMgr.addComponent({
          name: "ParentComp",
          type: ComponentType.Plain,
        });
        const parentCompBaseVariant = getBaseVariant(parentComp);

        const tplComp = mkTplComponentX({
          name: "tplComp",
          baseVariant: parentCompBaseVariant,
          component: instantiatedComp,
        });
        $$$(parentComp.tplTree).append(tplComp);
        fillVirtualSlotContents(tplMgr, tplComp);
        return site;
      })(),
      a: (site, tplMgr) => {
        const newComp = tplMgr.addComponent({
          name: "NewComp",
          type: ComponentType.Plain,
        });
        const newSlotParam = addSlotParam(site, newComp, "slot2");
        const newCompBaseVariant = getBaseVariant(newComp);
        const newTplSlot = mkSlot(newSlotParam, [
          mkTplTagX("div", {
            name: "defaultContent",
            baseVariant: newCompBaseVariant,
            variants: [mkVariantSetting({ variants: [newCompBaseVariant] })],
          }),
        ]);
        newTplSlot.vsettings = [
          mkVariantSetting({ variants: [newCompBaseVariant] }),
        ];
        $$$(newComp.tplTree).append(newTplSlot);
        tplMgr.swapComponents(
          ensure(
            site.components.find((c) => c.name === "InstantiatedComp"),
            () => "Should have InstantiatedComp"
          ),
          newComp
        );
        const tplComp = ensureKnownTplComponent(
          ensureKnownTplTag(
            site.components.find((c) => c.name === "ParentComp")!.tplTree
          ).children[0]
        );
        fillVirtualSlotContents(tplMgr, tplComp);
      },
      b: () => {},
    });
    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [],
    });
    expect(
      ensureKnownTplComponent(
        ensureKnownTplTag(
          result.mergedSite.components.find((c) => c.name === "ParentComp")!
            .tplTree
        ).children[0]
      ).vsettings[0].args.length
    ).toBe(1);
  });
  it("Make sure references in object keys are tracked", () => {
    const result = testMerge({
      ancestorSite: basicSite(),
      a: (site, tplMgr) => {
        const arena = ensure(
          site.arenas.find((a) => a.name === "My custom arena"),
          `Arena "My custom arena" not found`
        );
        const cmp = ensure(
          site.components.find((c) => c.name === "Button"),
          () => `Component "Button" not found`
        );
        const [options, color, type] = ["Options", "Color", "Type"].map(
          (group) =>
            ensure(
              cmp.variantGroups.find(
                (g) =>
                  g.param.variable.name.toLowerCase() === group.toLowerCase()
              ),
              () => `VariantGroup "${group}" not found`
            )
        );
        const frame = tplMgr.addNewMixedArenaFrame(
          arena,
          "PinnedVariants",
          cmp,
          {
            insertPt: new Pt(1500, 0),
          }
        );
        frame.pinnedVariants[options.variants[0].uuid] = true;
        frame.pinnedVariants[color.variants[0].uuid] = false;
        frame.pinnedVariants[type.variants[0].uuid] = true;
      },
      b: (site, tplMgr) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "Button"),
          () => `Component "Button" not found`
        );
        const [options, color] = ["Options", "Color"].map((group) =>
          ensure(
            cmp.variantGroups.find(
              (g) => g.param.variable.name.toLowerCase() === group.toLowerCase()
            ),
            () => `VariantGroup "${group}" not found`
          )
        );
        [options, color].forEach((vg) => {
          tplMgr.tryRemoveVariant(vg.variants[0], cmp);
        });
      },
    });
    const site = result.mergedSite;
    const arena = ensure(
      site.arenas.find((a) => a.name === "My custom arena"),
      `Arena "My custom arena" not found`
    );
    const cmp = ensure(
      site.components.find((c) => c.name === "Button"),
      () => `Component "Button" not found`
    );
    const [type] = ["Type"].map((group) =>
      ensure(
        cmp.variantGroups.find(
          (g) => g.param.variable.name.toLowerCase() === group.toLowerCase()
        ),
        () => `VariantGroup "${group}" not found`
      )
    );
    const frame = ensure(
      arena.children.find((c) => c.name === "PinnedVariants"),
      `Frame "PinnedVariants" not found`
    );
    expect(Object.entries(frame.pinnedVariants)).toMatchObject([
      [type.variants[0].uuid, true],
    ]);
  });
  it("Test ref to deleted variant in vsettings", () => {
    const result = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "Button"),
          () => `Component "Button" not found`
        );
        const group = ensure(
          cmp.variantGroups.find(
            (g) => g.param.variable.name.toLowerCase() === "color"
          ),
          () => `VariantGroup "Color" not found`
        );
        const vs = ensureVariantSetting(cmp.tplTree, [group.variants[0]]);
        vs.rs.values["color"] = "red";
      },
      b: (site, tplMgr) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "Button"),
          () => `Component "Button" not found`
        );
        const group = ensure(
          cmp.variantGroups.find(
            (g) => g.param.variable.name.toLowerCase() === "color"
          ),
          () => `VariantGroup "Color" not found`
        );
        tplMgr.tryRemoveVariant(group.variants[0], cmp);
      },
    });
    const site = result.mergedSite;
    const cmp = ensure(
      site.components.find((c) => c.name === "Button"),
      () => `Component "Button" not found`
    );
    expect(cmp.tplTree.vsettings.length).toBe(1);
    expect(cmp.tplTree.vsettings[0].rs.values["color"]).toBe(undefined);
  });
  it("Test ref deleted tpl from private style variant", () => {
    const result = testMerge({
      ancestorSite: basicSite(),
      a: (site, tplMgr) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "Button"),
          () => `Component "Button" not found`
        );
        const tpl = ensureKnownTplTag(
          ensureKnownTplTag(cmp.tplTree).children[0]
        );
        const styleVariant = tplMgr.createPrivateStyleVariant(cmp, tpl, [
          "Hover",
        ]);
        const vs = ensureVariantSetting(tpl, [styleVariant]);
        vs.rs.values["color"] = "red";
      },
      b: (site) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "Button"),
          () => `Component "Button" not found`
        );
        const tpl = ensureKnownTplTag(
          ensureKnownTplTag(cmp.tplTree).children[0]
        );
        $$$(tpl).remove({ deep: true });
      },
    });
    const site = result.mergedSite;
    const cmp = ensure(
      site.components.find((c) => c.name === "Button"),
      () => `Component "Button" not found`
    );
    const tpl = ensureKnownTplTag(ensureKnownTplTag(cmp.tplTree).children[0]);
    expect(tpl.vsettings.length).toBe(1);
    expect(tpl.vsettings[0].rs.values["color"]).toBe(undefined);
  });
  it("Test both branches adding private style variants", () => {
    const result = testMerge({
      ancestorSite: basicSite(),
      a: (site, tplMgr) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "Button"),
          () => `Component "Button" not found`
        );
        const tpl = ensureKnownTplTag(
          ensureKnownTplTag(cmp.tplTree).children[0]
        );
        const styleVariant = tplMgr.createPrivateStyleVariant(cmp, tpl, [
          "Hover",
        ]);
        const vs = ensureVariantSetting(tpl, [styleVariant]);
        vs.rs.values["color"] = "red";
      },
      b: (site, tplMgr) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "Button"),
          () => `Component "Button" not found`
        );
        const tpl = ensureKnownTplTag(
          ensureKnownTplTag(cmp.tplTree).children[0]
        );
        const styleVariant = tplMgr.createPrivateStyleVariant(cmp, tpl, [
          "Hover",
        ]);
        const vs = ensureVariantSetting(tpl, [styleVariant]);
        vs.rs.values["background"] = "linear-gradient(#EA0D0D, #EA0D0D)";
      },
    });
    const site = result.mergedSite;
    const cmp = ensure(
      site.components.find((c) => c.name === "Button"),
      () => `Component "Button" not found`
    );
    const tpl = ensureKnownTplTag(ensureKnownTplTag(cmp.tplTree).children[0]);
    expect(tpl.vsettings.length).toBe(2);
    // TODO: Test for registered variants
    expect(cmp.variants.filter((v) => isStyleVariant(v)).length).toBe(1);
    expect(tpl.vsettings[1].rs.values).toMatchObject({
      color: "red",
      background: "linear-gradient(#EA0D0D, #EA0D0D)",
    });
  });
  it("Test adding new args that re-use the same expression", () => {
    const result = testMerge({
      ancestorSite: (() => {
        const site = createSite();
        const tplMgr = new TplMgr({ site });
        const instantiatedComp = tplMgr.addComponent({
          name: "InstantiatedComp",
          type: ComponentType.Plain,
        });

        const parentComp = tplMgr.addComponent({
          name: "ParentComp",
          type: ComponentType.Plain,
        });

        const prop1 = mkParam({
          name: "prop1",
          type: typeFactory["any"](),
          paramType: "prop",
        });

        const prop2 = mkParam({
          name: "prop2",
          type: typeFactory["any"](),
          paramType: "prop",
        });

        const prop3 = mkParam({
          name: "prop3",
          type: typeFactory["any"](),
          paramType: "prop",
        });

        instantiatedComp.params.push(prop1, prop2, prop3);

        const parentCompBaseVariant = getBaseVariant(parentComp);

        const tplComp = mkTplComponentX({
          name: "tplComp",
          baseVariant: parentCompBaseVariant,
          component: instantiatedComp,
          args: {
            prop1: codeLit("a"),
          },
        });
        $$$(parentComp.tplTree).append(tplComp);
        return site;
      })(),
      a: (site) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "ParentComp"),
          () => `Component "ParentComp" not found`
        );
        const tpl = ensureKnownTplComponent(
          ensureKnownTplTag(cmp.tplTree).children[0]
        );
        tpl.vsettings[0].args.push(
          new Arg({
            param: ensure(
              tpl.component.params.find((p) => p.variable.name === "prop2"),
              () => `Couldn't find param prop2`
            ),
            expr: ensure(
              tpl.vsettings[0].args.find(
                (arg) => arg.param.variable.name === "prop1"
              ),
              () => `Couldn't find arg for prop1`
            ).expr,
          })
        );
        removeWhere(
          tpl.vsettings[0].args,
          (arg) => arg.param.variable.name === "prop1"
        );
      },
      b: (site) => {
        const cmp = ensure(
          site.components.find((c) => c.name === "ParentComp"),
          () => `Component "ParentComp" not found`
        );
        const tpl = ensureKnownTplComponent(
          ensureKnownTplTag(cmp.tplTree).children[0]
        );
        tpl.vsettings[0].args.push(
          new Arg({
            param: ensure(
              tpl.component.params.find((p) => p.variable.name === "prop3"),
              () => `Couldn't find param prop3`
            ),
            expr: ensure(
              tpl.vsettings[0].args.find(
                (arg) => arg.param.variable.name === "prop1"
              ),
              () => `Couldn't find arg for prop1`
            ).expr,
          })
        );
        removeWhere(
          tpl.vsettings[0].args,
          (arg) => arg.param.variable.name === "prop1"
        );
      },
    });
    const site = result.mergedSite;
    const cmp = ensure(
      site.components.find((c) => c.name === "ParentComp"),
      () => `Component "ParentComp" not found`
    );
    const tpl = ensureKnownTplComponent(
      ensureKnownTplTag(cmp.tplTree).children[0]
    );
    expect(
      sortBy(
        tpl.vsettings[0].args
          .filter((arg) => arg.param.variable.name.startsWith("prop"))
          .map((arg) => [
            arg.param.variable.name,
            ensureKnownCustomCode(arg.expr).code,
          ]),
        ([propName]) => propName
      )
    ).toMatchObject([
      ["prop2", '"a"'],
      ["prop3", '"a"'],
    ]);
  });
  it("Test creating dandling references in a tpl default contents", () => {
    const result = testMerge({
      ancestorSite: (() => {
        const site = createSite();
        const tplMgr = new TplMgr({ site });
        const instantiatedComp = tplMgr.addComponent({
          name: "InstantiatedComp",
          type: ComponentType.Plain,
        });
        const slotParam = addSlotParam(site, instantiatedComp, "slot");
        const instantiatedBaseVariant = getBaseVariant(instantiatedComp);
        const tplSlot = mkSlot(slotParam, [
          mkTplTagX("div", {
            name: "defaultContent",
            baseVariant: instantiatedBaseVariant,
            variants: [
              mkVariantSetting({ variants: [instantiatedBaseVariant] }),
            ],
          }),
        ]);
        tplSlot.vsettings = [
          mkVariantSetting({ variants: [instantiatedBaseVariant] }),
        ];
        $$$(instantiatedComp.tplTree).append(tplSlot);

        const tplText = mkTplTagX("div", {
          type: TplTagType.Text,
          name: "tplText",
        });
        const variantSetting = ensureBaseVariantSetting(
          instantiatedComp,
          tplText
        );
        const childTextTpl = mkTplInlinedText(
          "Heading",
          [ensureBaseVariant(instantiatedComp)],
          "h1"
        );
        childTextTpl.name = "childText";
        // Hack: it seems no longer possible to get a `RawText` to point
        // to a non-existing tpl node in the merge as any changes to
        // `RawText.markers` would replace the entire array. However,
        // we can still force to trigger this behavior by having a child of
        // a text tpl with no markers pointing to it.
        // The main point of this test is to make sure the general mechanism to
        // detect weak references to instances that have never been observed
        // by mobx works (e.g., ensure that if observable-model fails to detect
        // it and `ChangeRecorder.getDeletedInstsWithDanglingRefs` always
        // returns an empty set will make this test fail).
        variantSetting.text = new RawText({
          text: "Hello world!\n[child]\nWhat up!",
          markers: [],
        });

        $$$(tplText).append(childTextTpl);
        $$$(tplSlot).append(tplText);

        const parentComp = tplMgr.addComponent({
          name: "ParentComp",
          type: ComponentType.Plain,
        });
        const parentCompBaseVariant = getBaseVariant(parentComp);

        const tplComp = mkTplComponentX({
          name: "tplComp",
          baseVariant: parentCompBaseVariant,
          component: instantiatedComp,
        });
        $$$(parentComp.tplTree).append(tplComp);
        fillVirtualSlotContents(tplMgr, tplComp);
        return site;
      })(),
      a: (site) => {
        const instantiatedComp = ensure(
          site.components.find((c) => c.name === "InstantiatedComp"),
          () => `Component "InstantiatedComp" not found`
        );
        const tplText = ensureKnownTplTag(
          flattenTpls(instantiatedComp.tplTree).find(
            (tpl) => (tpl as any).name === "tplText"
          )
        );
        tplText.children = [];
      },
      b: (site) => {
        const instantiatedComp = ensure(
          site.components.find((c) => c.name === "InstantiatedComp"),
          () => `Component "InstantiatedComp" not found`
        );
        const tplText = ensureKnownTplTag(
          flattenTpls(instantiatedComp.tplTree).find(
            (tpl) => (tpl as any).name === "tplText"
          )
        );
        const childTextTpl = ensureKnownTplTag(
          flattenTpls(instantiatedComp.tplTree).find(
            (tpl) => (tpl as any).name === "childText"
          )
        );
        const text = ensureKnownRawText(tplText.vsettings[0].text);
        text.markers = [
          new NodeMarker({
            position: 14,
            length: 7,
            // Only now we create the marker pointing to the tpl node
            tpl: childTextTpl,
          }),
        ];
      },
    });
    expect(result).toMatchObject({
      status: "merged",
    });
    const instantiatedComp = ensure(
      result.mergedSite.components.find((c) => c.name === "InstantiatedComp"),
      () => `Component "InstantiatedComp" not found`
    );
    const tplText = ensureKnownTplTag(
      flattenTpls(instantiatedComp.tplTree).find(
        (tpl) => (tpl as any).name === "tplText"
      )
    );
    const text = ensureKnownRawText(tplText.vsettings[0].text);
    expect(tplText.children.length).toBe(0);
    expect(text.markers.length).toBe(0);
  });
  it("Test merging rich text with conflict", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(richTextConflict),
      ["left"]
    );
    expect(result).toMatchObject({
      status: "merged",
    });
    const comp = ensure(
      result.mergedSite.components.find((c) => !c.name),
      () => `Couldn't find arena frame`
    );
    const tplText = ensureKnownTplTag(
      ensureKnownTplTag(comp.tplTree).children[0]
    );
    const parentText = ensureKnownRawText(tplText.vsettings[0].text);
    expect(parentText.text).toBe("Test [child] child2");
    expect(parentText.markers.length).toBe(1);
    expect(tplText.children.length).toBe(1);
    expect(ensureKnownNodeMarker(parentText.markers[0]).tpl).toBe(
      tplText.children[0]
    );
    const childText = ensureKnownRawText(
      ensureKnownTplTag(tplText.children[0]).vsettings[0].text
    );
    expect(childText.text).toBe("w/");
    expect(childText.markers.length).toBe(0);
  });
  it("Do not clone RenderExpr args", () => {
    let tplToMoveUuid = "";
    const result = testMerge({
      ancestorSite: (() => {
        const site = createSite();
        const tplMgr = new TplMgr({ site });
        const instantiatedComp = tplMgr.addComponent({
          name: "InstantiatedComp",
          type: ComponentType.Plain,
        });
        const slotParam = addSlotParam(site, instantiatedComp, "children");
        const instantiatedBaseVariant = getBaseVariant(instantiatedComp);
        const tplSlot = mkSlot(slotParam, [
          mkTplTagX("div", {
            name: "defaultContent",
            baseVariant: instantiatedBaseVariant,
            variants: [
              mkVariantSetting({ variants: [instantiatedBaseVariant] }),
            ],
          }),
        ]);
        tplSlot.vsettings = [
          mkVariantSetting({ variants: [instantiatedBaseVariant] }),
        ];
        $$$(instantiatedComp.tplTree).append(tplSlot);

        const parentComp = tplMgr.addComponent({
          name: "ParentComp",
          type: ComponentType.Plain,
        });
        const parentCompBaseVariant = getBaseVariant(parentComp);

        const tplComp = mkTplComponentX({
          name: "tplComp",
          baseVariant: parentCompBaseVariant,
          component: instantiatedComp,
        });
        const tplToMove = mkTplTagX("div", {
          name: "tplToMove",
          baseVariant: parentCompBaseVariant,
          variants: [mkVariantSetting({ variants: [parentCompBaseVariant] })],
        });
        tplToMoveUuid = tplToMove.uuid;
        $$$(parentComp.tplTree).append(tplComp);
        $$$(parentComp.tplTree).append(tplToMove);
        fillVirtualSlotContents(tplMgr, tplComp);
        return site;
      })(),
      a: () => {},
      b: (site) => {
        const parentComp = ensure(
          site.components.find((c) => c.name === "ParentComp"),
          () => `Component "ParentComp" not found`
        );
        const tplComp = ensure(
          flattenTpls(parentComp.tplTree).find(
            (tpl) => (tpl as any).name === "tplComp"
          ),
          () => `Couldn't find tpl "tplComp"`
        );
        const tplToMove = ensure(
          flattenTpls(parentComp.tplTree).find(
            (tpl) => (tpl as any).name === "tplToMove"
          ),
          () => `Couldn't find tpl "tplToMove"`
        );
        $$$(tplToMove).remove({ deep: false });
        $$$(tplComp).append(tplToMove);
      },
    });
    expect(result.status).toBe("merged");
    const parentComp = ensure(
      result.mergedSite.components.find((c) => c.name === "ParentComp"),
      () => `Component "ParentComp" not found`
    );
    const tplComp = ensure(
      flattenTpls(parentComp.tplTree).find(
        (tpl) => (tpl as any).name === "tplComp"
      ),
      () => `Couldn't find tpl "tplComp"`
    );
    const tplToMove = ensure(
      flattenTpls(parentComp.tplTree).find(
        (tpl) => (tpl as any).name === "tplToMove"
      ),
      () => `Couldn't find tpl "tplToMove"`
    );
    expect(tplToMove.parent).toBe(tplComp);
    expect(tplToMove.uuid).toBe(tplToMoveUuid);
  });

  it("Global context should merge without conflicts", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(globalContextBundle)
    );
    expect(result).toMatchObject({
      status: "merged",
    });
    const site = result.mergedSite;
    const globalContextComponent = site.components.filter(
      (c) => c.name === "GlobalContext"
    );
    expect(globalContextComponent.length).toBe(1);
    expect(site.globalContexts.length).toBe(1);
    const globalContextTpl = site.globalContexts[0];
    const argValues = globalContextTpl.vsettings[0].args;
    expect(argValues.length).toBe(2);
    expect(
      argValues.find((arg) => arg.param.variable.name === "propA")
    ).not.toBeNil();
    expect(
      argValues.find((arg) => arg.param.variable.name === "propB")
    ).not.toBeNil();
    expect(tryExtractJson(argValues[0].expr)).toBe("set");
    expect(tryExtractJson(argValues[1].expr)).toBe("set");
  });

  it("Style tokens should not have conflicts when removing", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(styleTokenBundle)
    );

    expect(result).toMatchObject({
      status: "merged",
    });
  });

  it("Reroot should not delete entire tpl tree", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(rerootBundle)
    );
    expect(result).toMatchObject({
      status: "merged",
    });
    const tplTree = result.mergedSite.components.find(
      (c) => c.name === "Test"
    )!.tplTree;
    assert(isKnownTplTag(tplTree), "Root should be tpl tag");
    expect(tplTree.children.length).toBe(1);
  });

  it("Re-computed only the needed Virtual Slot Args", () => {
    let originalUuidSlotArg1 = "",
      originalUuidSlotArg2 = "";
    const result = testMerge({
      ancestorSite: (() => {
        // Create a component with two slots and instantiate it
        const site = createSite();
        const tplMgr = new TplMgr({ site });
        const instantiatedComp = tplMgr.addComponent({
          name: "InstantiatedComp",
          type: ComponentType.Plain,
        });
        const slotParam1 = addSlotParam(site, instantiatedComp, "slot1");
        const instantiatedBaseVariant = getBaseVariant(instantiatedComp);
        const tplSlot1 = mkSlot(slotParam1, [
          mkTplTagX("div", {
            name: "slot1Element1",
            baseVariant: instantiatedBaseVariant,
            variants: [
              mkVariantSetting({ variants: [instantiatedBaseVariant] }),
            ],
          }),
        ]);
        tplSlot1.vsettings = [
          mkVariantSetting({ variants: [instantiatedBaseVariant] }),
        ];
        $$$(instantiatedComp.tplTree).append(tplSlot1);
        const slotParam2 = addSlotParam(site, instantiatedComp, "slot2");
        const tplSlot2 = mkSlot(slotParam2, [
          mkTplTagX("div", {
            name: "slot2Element1",
            baseVariant: instantiatedBaseVariant,
            variants: [
              mkVariantSetting({ variants: [instantiatedBaseVariant] }),
            ],
          }),
        ]);
        tplSlot2.vsettings = [
          mkVariantSetting({ variants: [instantiatedBaseVariant] }),
        ];
        $$$(instantiatedComp.tplTree).append(tplSlot2);

        const parentComp = tplMgr.addComponent({
          name: "ParentComp",
          type: ComponentType.Plain,
        });
        const parentCompBaseVariant = getBaseVariant(parentComp);

        const tplComp = mkTplComponentX({
          name: "tplComp",
          baseVariant: parentCompBaseVariant,
          component: instantiatedComp,
        });
        $$$(parentComp.tplTree).append(tplComp);
        fillVirtualSlotContents(tplMgr, tplComp);
        originalUuidSlotArg1 = (
          ensure(
            flattenTpls(parentComp.tplTree).find(
              (tpl) => tpl instanceof TplTag && tpl.name === "slot1Element1"
            ),
            () => `Couldn't find slot1Element1`
          ) as TplTag
        ).uuid;
        originalUuidSlotArg2 = (
          ensure(
            flattenTpls(parentComp.tplTree).find(
              (tpl) => tpl instanceof TplTag && tpl.name === "slot2Element1"
            ),
            () => `Couldn't find slot2Element1`
          ) as TplTag
        ).uuid;
        return site;
      })(),
      a: (site, tplMgr) => {
        // Edit the first slot to append a new element in the default contents
        const instantiatedComp = ensure(
          site.components.find((c) => c.name === "InstantiatedComp"),
          () => "Should have InstantiatedComp"
        );
        const parentComp = ensure(
          site.components.find((c) => c.name === "ParentComp"),
          () => "Should have ParentComp"
        );
        const tplComp = ensure(
          flattenTpls(parentComp.tplTree).find(
            (tpl) => tpl instanceof TplComponent && tpl.name === "tplComp"
          ),
          () => `Couldn't find tplComp`
        ) as TplComponent;
        const tplSlot1 = ensure(
          flattenTpls(instantiatedComp.tplTree).find(
            (tpl) =>
              tpl instanceof TplSlot && tpl.param.variable.name === "slot1"
          ),
          () => `Couldn't find slot1`
        ) as TplSlot;
        const instantiatedBaseVariant = getBaseVariant(instantiatedComp);
        $$$(tplSlot1).append(
          mkTplTagX("div", {
            name: "slot1Element2",
            baseVariant: instantiatedBaseVariant,
            variants: [
              mkVariantSetting({ variants: [instantiatedBaseVariant] }),
            ],
          })
        );
        fillVirtualSlotContents(tplMgr, tplComp, [tplSlot1]);
      },
      b: (site, tplMgr) => {
        // Edit the first slot to prepend a new element in the default contents
        const instantiatedComp = ensure(
          site.components.find((c) => c.name === "InstantiatedComp"),
          () => "Should have InstantiatedComp"
        );
        const parentComp = ensure(
          site.components.find((c) => c.name === "ParentComp"),
          () => "Should have ParentComp"
        );
        const tplComp = ensure(
          flattenTpls(parentComp.tplTree).find(
            (tpl) => tpl instanceof TplComponent && tpl.name === "tplComp"
          ),
          () => `Couldn't find tplComp`
        ) as TplComponent;
        const tplSlot1 = ensure(
          flattenTpls(instantiatedComp.tplTree).find(
            (tpl) =>
              tpl instanceof TplSlot && tpl.param.variable.name === "slot1"
          ),
          () => `Couldn't find slot1`
        ) as TplSlot;
        const instantiatedBaseVariant = getBaseVariant(instantiatedComp);
        $$$(tplSlot1).prepend(
          mkTplTagX("div", {
            name: "slot1Element0",
            baseVariant: instantiatedBaseVariant,
            variants: [
              mkVariantSetting({ variants: [instantiatedBaseVariant] }),
            ],
          })
        );
        fillVirtualSlotContents(tplMgr, tplComp, [tplSlot1]);
      },
    });
    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [],
    });
    const parentComp = ensure(
      result.mergedSite.components.find((c) => c.name === "ParentComp"),
      () => "Should have ParentComp"
    );
    const mergedUuidSlotArg1 = (
      ensure(
        flattenTpls(parentComp.tplTree).find(
          (tpl) => tpl instanceof TplTag && tpl.name === "slot1Element1"
        ),
        () => `Couldn't find slot1Element1`
      ) as TplTag
    ).uuid;
    const mergedUuidSlotArg2 = (
      ensure(
        flattenTpls(parentComp.tplTree).find(
          (tpl) => tpl instanceof TplTag && tpl.name === "slot2Element1"
        ),
        () => `Couldn't find slot2Element1`
      ) as TplTag
    ).uuid;
    const tplComp = ensure(
      flattenTpls(parentComp.tplTree).find(
        (tpl) => tpl instanceof TplComponent && tpl.name === "tplComp"
      ),
      () => `Couldn't find tplComp`
    ) as TplComponent;
    expect(
      tplChildren(tplComp).map((tpl) => tpl instanceof TplTag && tpl.name)
    ).toMatchObject([
      "slot1Element0",
      "slot1Element1",
      "slot1Element2",
      "slot2Element1",
    ]);
    expect(mergedUuidSlotArg1).not.toBe(originalUuidSlotArg1);
    expect(mergedUuidSlotArg2).toBe(originalUuidSlotArg2);
  });

  it("Handles reparenting an element from ancestor to a newer elemenet", () => {
    function findElementsInSite(site: Site, compName: string, tplName: string) {
      const component = ensure(
        site.components.find((c) => c.name === compName),
        `Component ${compName} not found`
      );
      const tpls = flattenTpls(component.tplTree);
      const tpl = ensure(
        tpls.find(
          (_tpl): _tpl is TplNamable =>
            isTplNamable(_tpl) && _tpl.name === tplName
        ),
        `Tpl ${tplName} not found`
      );
      return {
        component,
        tpl,
      };
    }
    const result = testMerge({
      ancestorSite: basicSite(),
      a: () => {},
      b: (site, tplMgr) => {
        const { tpl, component } = findElementsInSite(site, "Button", "A");
        const baseVariant = getBaseVariant(component);

        tpl.name = "Newer A";
        tpl.vsettings[0].attrs["id"] = codeLit("Dynamic ID");
        $$$(tpl).wrap(
          mkTplTagX("div", {
            name: "A-Wrapper",
            baseVariant,
            variants: [mkVariantSetting({ variants: [baseVariant] })],
          })
        );
      },
    });

    const { mergedSite } = result;
    const { tpl: tplWrapper, component } = findElementsInSite(
      mergedSite,
      "Button",
      "A-Wrapper"
    );
    const { tpl: tplA } = findElementsInSite(mergedSite, "Button", "Newer A");
    assert(isKnownTplTag(tplWrapper), "Expected wrapper to be a TplTag");
    expect(tplWrapper.children.length).toBe(1);
    expect(tplWrapper.parent).toBe(component.tplTree);
    expect(tplA.parent).toBe(tplWrapper);
    expect(tplA.vsettings[0].attrs["id"]).toBeInstanceOf(CustomCode);
    expect((tplA.vsettings[0].attrs["id"] as CustomCode).code).toBe(
      '"Dynamic ID"'
    );
  });

  it("shouldn't consider rename elements if the repeated name was deleted", () => {
    const result = testMerge({
      ancestorSite: basicSite(),
      a: () => {},
      b: (site, tplMgr) => {
        const button = ensure(
          site.components.find((c) => c.name === "Button"),
          "Button not found"
        );
        tplMgr.removeComponent(button);
        tplMgr.addComponent({
          name: "Button",
          type: ComponentType.Plain,
        });
      },
    });
    expect(result.autoReconciliations.length).toBe(0);
  });

  it("shouldn't rename tpl elements based on unchanged names from ancestor site", () => {
    // If some tpl element kept the same name from the ancestor version, we don't need
    // to consider this name when running `preFixTplNames` before the merge, this is because
    // the invariants of name were mantained while the user made changes in the branches
    const result = testMerge({
      ancestorSite: basicSite(),
      a: () => {},
      b: (site, tplMgr) => {
        const button = ensure(
          site.components.find((c) => c.name === "Button"),
          "Button not found"
        );
        const tpls = flattenTpls(button.tplTree);
        const nodeA = ensure(
          tpls.find(
            (tpl): tpl is TplNamable => isTplNamable(tpl) && tpl.name === "A"
          ),
          "Tpl with name A not found"
        );
        nodeA.name = "OldA";

        const baseVariant = getBaseVariant(button);
        $$$(button.tplTree).append(
          mkTplTagX("div", {
            name: "A",
            baseVariant,
            variants: [mkVariantSetting({ variants: [baseVariant] })],
          })
        );
      },
    });
    expect(result.autoReconciliations.length).toBe(0);
  });

  it("merges reparenting element moved inside a slot arg", () => {
    const result = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {},
      b: (site) => {
        const comp = ensure(
          site.components.find((c) => c.name === "InstantiateSlotArgs"),
          () => "Couldn't find InstantiateSlotArgs"
        );
        let tplComp: TplComponent = undefined as any;
        flattenTpls(comp.tplTree).forEach((tpl) => {
          if (isKnownTplComponent(tpl) && tpl.name === "tplComp") {
            tplComp = tpl;
          }
        });
        const slot1 = ensure(
          $$$(ensure(tplComp, () => `tplComp is undefined`)).getSlotArg(
            "slot1"
          ),
          () => `No slot arg for slot1`
        );
        const slot2 = ensure(
          $$$(tplComp).getSlotArg("slot2"),
          () => `No slot arg for slot2`
        );
        const [node1] = ensureKnownRenderExpr(slot1.expr).tpl;
        const [node2, node3] = ensureKnownRenderExpr(slot2.expr).tpl;
        ensureKnownRenderExpr(slot1.expr).tpl = [];
        ensureKnownRenderExpr(slot2.expr).tpl = [node2, node3, node1];
      },
    });
    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [],
    });
  });

  it("merges reparenting element moved inside a slot arg and a new element is created", () => {
    const result = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {},
      b: (site) => {
        const comp = ensure(
          site.components.find((c) => c.name === "InstantiateSlotArgs"),
          () => "Couldn't find InstantiateSlotArgs"
        );
        let tplComp: TplComponent = undefined as any;
        flattenTpls(comp.tplTree).forEach((tpl) => {
          if (isKnownTplComponent(tpl) && tpl.name === "tplComp") {
            tplComp = tpl;
          }
        });
        const slot1 = ensure(
          $$$(ensure(tplComp, () => `tplComp is undefined`)).getSlotArg(
            "slot1"
          ),
          () => `No slot arg for slot1`
        );
        const slot2 = ensure(
          $$$(tplComp).getSlotArg("slot2"),
          () => `No slot arg for slot2`
        );
        const [node1] = ensureKnownRenderExpr(slot1.expr).tpl;
        const [node2, node3] = ensureKnownRenderExpr(slot2.expr).tpl;
        const node4 = mkTplTagX("div", {
          name: "SlotArgNode4",
          baseVariant: getBaseVariant(comp),
          variants: [
            mkVariantSetting({
              variants: [getBaseVariant(comp)],
            }),
          ],
        });
        node4.parent = tplComp;
        ensureKnownRenderExpr(slot1.expr).tpl = [node4];
        ensureKnownRenderExpr(slot2.expr).tpl = [node1];
      },
    });
    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [],
    });
  });

  it("merges slot params after swapping code components instances", () => {
    const result = testMerge({
      ancestorSite: basicSite(),
      a: (site) => {},
      b: (site) => {
        const tplMgr = new TplMgr({ site });
        const comp = ensure(
          site.components.find((c) => c.name === "InstantiateSlotArgs"),
          () => "Couldn't find InstantiateSlotArgs"
        );
        let tplComp: TplComponent = undefined as any;
        flattenTpls(comp.tplTree).forEach((tpl) => {
          if (isKnownTplComponent(tpl) && tpl.name === "tplComp") {
            tplComp = tpl;
          }
        });
        const slot1 = ensure(
          $$$(ensure(tplComp, () => `tplComp is undefined`)).getSlotArg(
            "slot1"
          ),
          () => `No slot arg for slot1`
        );
        const slot2 = ensure(
          $$$(tplComp).getSlotArg("slot2"),
          () => `No slot arg for slot2`
        );
        const [node1] = ensureKnownRenderExpr(slot1.expr).tpl;
        const [node2, node3] = ensureKnownRenderExpr(slot2.expr).tpl;
        const node4 = mkTplTagX("div", {
          name: "SlotArgNode4",
          baseVariant: getBaseVariant(comp),
          variants: [
            mkVariantSetting({
              variants: [getBaseVariant(comp)],
            }),
          ],
        });
        node4.parent = tplComp;
        ensureKnownRenderExpr(slot1.expr).tpl = [node4];
        ensureKnownRenderExpr(slot2.expr).tpl = [node1];

        const codeComponentWithSlots = mkCodeComponent(
          "CodeComponentWithSlots",
          {
            name: "CodeComponentWithSlots",
            props: {},
            importPath: "",
          },
          {}
        );
        tplMgr.attachComponent(codeComponentWithSlots);
        const baseVariantCcWithSlots = getBaseVariant(codeComponentWithSlots);

        const slot1Param = addSlotParam(site, codeComponentWithSlots, "slot1");
        const slot1cc = mkSlot(slot1Param, []);
        ensureBaseVariantSetting(codeComponentWithSlots, slot1cc);

        const slot2Param = addSlotParam(site, codeComponentWithSlots, "slot2");
        const slot2cc = mkSlot(slot2Param, []);
        ensureBaseVariantSetting(codeComponentWithSlots, slot2cc);

        codeComponentWithSlots.tplTree = mkTplTagX(
          "div",
          {
            attrs: {},
            baseVariant: baseVariantCcWithSlots,
          },
          [slot1cc, slot2cc]
        );

        tplMgr.swapComponents(tplComp.component, codeComponentWithSlots);
      },
    });

    expect(result).toMatchObject({
      status: "merged",
      autoReconciliations: [],
    });

    const { mergedSite: site } = result;

    const comp = ensure(
      site.components.find((c) => c.name === "InstantiateSlotArgs"),
      () => "Couldn't find InstantiateSlotArgs"
    );
    let tplComp: TplComponent = undefined as any;
    flattenTpls(comp.tplTree).forEach((tpl) => {
      if (isKnownTplComponent(tpl) && tpl.name === "tplComp") {
        tplComp = tpl;
      }
    });

    expect(
      tplComp.vsettings[0].args.filter(
        (arg) => arg.param.variable.name === "slot1"
      ).length
    ).toEqual(1);

    expect(
      tplComp.vsettings[0].args.filter(
        (arg) => arg.param.variable.name === "slot2"
      ).length
    ).toEqual(1);
  });
});
