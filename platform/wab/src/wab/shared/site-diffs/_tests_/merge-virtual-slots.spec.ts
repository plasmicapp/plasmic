import { ProjectFullDataResponse } from "@/wab/shared/ApiSchema";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import { assert, ensure, hackyCast, intersectSets } from "@/wab/shared/common";
import { getParamByVarName } from "@/wab/shared/core/components";
import { flattenTpls, isTplNamable } from "@/wab/shared/core/tpls";
import {
  isKnownTplComponent,
  isKnownVirtualRenderExpr,
  Site,
  TplComponent,
  TplNode,
} from "@/wab/shared/model/classes";
import defaultSlotChangeBundle from "@/wab/shared/site-diffs/_tests_/bundles/default-slot-change.json";
import {
  fetchLastBundleVersion,
  testMergeFromJsonBundle,
} from "@/wab/shared/site-diffs/_tests_/utils";
import { getSlotArg } from "@/wab/shared/SlotUtils";

beforeAll(async () => {
  await fetchLastBundleVersion();
});

function getComponentInstance(site: Site) {
  const homepage = ensure(
    site.components.find((c) => c.name === "/"),
    "Couldn't find Homepage"
  );
  const instance = ensure(
    flattenComponent(homepage).find(
      (tpl) => isTplNamable(tpl) && tpl.name === "wrappedInstance"
    ),
    "Couldn't find wrappedInstance"
  );

  assert(isKnownTplComponent(instance), "Found instance is not of a component");

  return instance;
}

function getSlotParamContent(
  ancestorInstance: TplComponent,
  mergedInstance: TplComponent,
  slot: "target" | "content"
) {
  const ancestorParam = ensure(
    getParamByVarName(ancestorInstance.component, slot),
    `Couldn't find ancestor ${slot} param`
  );

  const mergedParam = ensure(
    getParamByVarName(mergedInstance.component, slot),
    `Couldn't find merged ${slot} param`
  );

  expect(ancestorParam.uuid).toEqual(mergedParam.uuid);

  const ancestorSlot = ensure(
    getSlotArg(ancestorInstance, ancestorParam),
    `Couldn't find ancestor ${slot} slot`
  ).expr;
  const mergedSlot = ensure(
    getSlotArg(mergedInstance, mergedParam),
    `Couldn't find merged ${slot} slot`
  ).expr;

  assert(
    isKnownVirtualRenderExpr(ancestorSlot),
    `Ancestor ${slot} content should be virtual render expr`
  );

  assert(
    isKnownVirtualRenderExpr(mergedSlot),
    `Merged ${slot} content should be virtual render expr`
  );

  return {
    ancestorSlot,
    mergedSlot,
  };
}

function uuidsOfFlattenedTpls(tpls: TplNode[]) {
  return tpls.flatMap((tpl) => flattenTpls(tpl).map(({ uuid }) => uuid));
}

describe("Merging virtual slots", () => {
  it("shouldn't overwrite args for unchanged slots", () => {
    /**
     * defaultSlotChangeBundle contains the following components:
     *
     * BaseComp:
     *   - A component that exposes two slot targets: `target` and `content`
     *
     * WrappedComp:
     *   - A component that wraps BaseComp and forwards the slots of BaseComp
     *   - Both slots now contain a vertical stack with a single text node
     *
     * /:
     *   - A page that instantiates WrappedComp
     *
     *
     * The difference between both branches is that the default value of the text node in the `content` slot is different.
     * `Content` in main branch and `Content (changed)` in the broken branch.
     *
     * After merge we should expect that the `target` slot remains the same and the `content` slot should be different in the merged
     * site instance in `WrappedComp`
     */
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(defaultSlotChangeBundle)
    );

    expect(result).toMatchObject({
      status: "merged",
    });

    assert("ancestorSite" in result, "Expected ancestorSite to be returned");

    const ancestor = result.ancestorSite;
    const merged = result.mergedSite;

    const ancestorInstance = getComponentInstance(ancestor);
    const mergedInstance = getComponentInstance(merged);

    const { ancestorSlot: ancestorSlotTarget, mergedSlot: mergedSlotTarget } =
      getSlotParamContent(ancestorInstance, mergedInstance, "target");

    // Since this slot wasn't changed, we should expect all the uuids to be the same
    expect(uuidsOfFlattenedTpls(mergedSlotTarget.tpl)).toEqual(
      uuidsOfFlattenedTpls(ancestorSlotTarget.tpl)
    );

    const { ancestorSlot: ancestorSlotContent, mergedSlot: mergedSlotContent } =
      getSlotParamContent(ancestorInstance, mergedInstance, "content");

    const uuidsAncestorSlotContent = uuidsOfFlattenedTpls(
      ancestorSlotContent.tpl
    );
    const uuidsMergedSlotContent = uuidsOfFlattenedTpls(mergedSlotContent.tpl);

    expect(uuidsAncestorSlotContent.length).toEqual(
      uuidsMergedSlotContent.length
    );

    // All the uuids should be different because we changed the default value of the text node in the `content` slot
    // which triggered the default content to be resynced
    expect(
      intersectSets(
        new Set(uuidsAncestorSlotContent),
        new Set(uuidsMergedSlotContent)
      ).size
    ).toEqual(0);
  });
});
