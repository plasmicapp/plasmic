import { ProjectFullDataResponse } from "@/wab/shared/ApiSchema";
import { assert, ensure, hackyCast } from "@/wab/shared/common";
import { TplNamable, flattenTpls, isTplNamable } from "@/wab/shared/core/tpls";
import {
  ensureKnownCustomCode,
  ensureKnownEventHandler,
  ensureKnownInteraction,
} from "@/wab/shared/model/classes";
import multipleInteractionsWithConflicts from "@/wab/shared/site-diffs/_tests_/bundles/multiple-interactions-with-conflicts.json";
import {
  fetchLastBundleVersion,
  testMergeFromJsonBundle,
} from "@/wab/shared/site-diffs/_tests_/utils";
import { groupBy } from "lodash";

beforeAll(async () => {
  await fetchLastBundleVersion();
});

describe("Multiple interactions with conflicts", () => {
  it("should detect conflicts", () => {
    /**
     * The bundle contains a single page with 5 child elements.
     * Each child element has a different interaction in this order:
     * 1. change state
     * 2. update variant
     * 3. go to page
     * 4. run code
     * 5. combination of previous interactions
     *
     * All the interactions differ between main and branch.
     */
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(multipleInteractionsWithConflicts),
      { skipConflictsChecks: true }
    );

    assert(
      result.status === "needs-resolution",
      "Expected needs-resolution status"
    );

    expect(result.genericDirectConflicts).toHaveLength(1);
    expect(result.genericDirectConflicts[0].conflictDetails).toHaveLength(5);
    expect(result.specialDirectConflicts).toHaveLength(0);

    // First 4 changes should be only interactions as only the args differ
    expect(
      result.genericDirectConflicts[0].conflictDetails
        .slice(0, 4)
        .map(({ leftUpdate }) => {
          const updatedInst = ensureKnownInteraction(leftUpdate.updatedInst);
          return updatedInst.actionName;
        })
    ).toMatchObject([
      "updateVariable",
      "updateVariant",
      "navigation",
      "customFunction",
    ]);

    // The last change is of the whole event handler
    result.genericDirectConflicts[0].conflictDetails
      .slice(4, 5)
      .forEach(({ leftUpdate }) => {
        ensureKnownEventHandler(leftUpdate.updatedInst);
      });
  });

  it("should merge elements with conflicts", () => {
    const result = testMergeFromJsonBundle(
      hackyCast<ProjectFullDataResponse>(multipleInteractionsWithConflicts),
      { conflictPicks: ["left"] }
    );

    assert(
      result.status === "merged",
      "Expected merge to be successful after resolving conflicts"
    );

    const { mergedSite } = result;
    const component = ensure(
      mergedSite.components.find((c) => c.name === "InteractionsWithConflicts"),
      "Component InteractionsWithConflicts not found"
    );
    const tpls = flattenTpls(component.tplTree).filter(
      (tpl): tpl is TplNamable => isTplNamable(tpl) && !!tpl.name
    );
    const tplsByName = groupBy(tpls, (tpl) => tpl.name);

    const changeStateOnClickEventHandler = ensureKnownEventHandler(
      tplsByName["changeState"][0].vsettings[0].attrs.onClick
    );
    expect(changeStateOnClickEventHandler.interactions).toHaveLength(1);
    expect(changeStateOnClickEventHandler.interactions[0].actionName).toEqual(
      "updateVariable"
    );
    expect(changeStateOnClickEventHandler.interactions[0].args).toHaveLength(3);
    expect(
      ensureKnownCustomCode(
        changeStateOnClickEventHandler.interactions[0].args[2].expr
      ).code
    ).toEqual('("First version branch")');

    const updateVariantOnClickEventHandler = ensureKnownEventHandler(
      tplsByName["updateVariant"][0].vsettings[0].attrs.onClick
    );
    expect(updateVariantOnClickEventHandler.interactions).toHaveLength(1);
    expect(updateVariantOnClickEventHandler.interactions[0].actionName).toEqual(
      "updateVariant"
    );
    expect(updateVariantOnClickEventHandler.interactions[0].args).toHaveLength(
      2
    );
    expect(
      ensureKnownCustomCode(
        updateVariantOnClickEventHandler.interactions[0].args[1].expr
      ).code
    ).toEqual("2");

    const combinedActionsOnClickEventHandler = ensureKnownEventHandler(
      tplsByName["combinedActions"][0].vsettings[0].attrs.onClick
    );
    expect(combinedActionsOnClickEventHandler.interactions).toHaveLength(2);
    expect(
      combinedActionsOnClickEventHandler.interactions.map(
        (interaction) => interaction.actionName
      )
    ).toEqual(["updateVariable", "customFunction"]);
  });
});
