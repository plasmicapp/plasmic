import { createInteraction } from "@/wab/client/operations/create-interaction";
import { setupComponentWithInstance } from "@/wab/client/operations/tests/utils";
import { updateInteraction } from "@/wab/client/operations/update-interaction";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { mkInteraction } from "@/wab/shared/core/states";
import {
  Interaction,
  TplTag,
  isKnownFunctionExpr,
} from "@/wab/shared/model/classes";
import { err } from "neverthrow";

describe("updateInteraction", () => {
  function setupWithSteps() {
    const fixture = setupComponentWithInstance();
    const root = fixture.page.tplTree as TplTag;
    ensureVariantSetting(root, [getBaseVariant(fixture.page)]);
    const first = createInteraction({
      component: fixture.page,
      tpl: root,
      eventName: "onClick",
      name: "Save",
      action: { actionName: "customFunction", code: "$state.count + 1" },
    });
    assert(first.isOk(), "setup failed");
    const second = createInteraction({
      component: fixture.page,
      tpl: root,
      eventName: "onClick",
      name: "Log",
      action: {
        actionName: "customFunction",
        code: "console.log($steps.save)",
      },
    });
    assert(second.isOk(), "setup failed");
    return {
      ...fixture,
      root,
      first: first.value,
      second: second.value,
    };
  }

  function bodyCode(interaction: Interaction) {
    const arg = interaction.args.find((a) => a.name === "customFunction");
    assert(arg && isKnownFunctionExpr(arg.expr), "expected a FunctionExpr arg");
    return arg.expr.bodyExpr;
  }

  it("renames and fixes $steps references in sibling steps", () => {
    const { page, first, second } = setupWithSteps();

    const result = updateInteraction(page, first, { name: "Persist" });

    assert(result.isOk(), "expected success result");
    expect(first.interactionName).toEqual("Persist");
    expect(bodyCode(second)).toMatchObject({
      code: "(console.log($steps.persist))",
    });
  });

  it("dedupes a rename that collides after $steps normalization", () => {
    const { page, first, second } = setupWithSteps();

    // "Log" is taken by the sibling; "log" normalizes to the same $steps key.
    const result = updateInteraction(page, first, { name: "log" });

    assert(result.isOk(), "expected success result");
    expect(first.interactionName).toEqual("log 2");
    expect(bodyCode(second)).toMatchObject({
      code: "(console.log($steps.log2))",
    });
  });

  it("updates the code", () => {
    const { page, first } = setupWithSteps();

    const result = updateInteraction(page, first, {
      action: { actionName: "customFunction", code: "$state.count = 0" },
    });

    assert(result.isOk(), "expected success result");
    expect(bodyCode(first)).toMatchObject({ code: "($state.count = 0)" });
  });

  it("rejects replacing the action of unsupported Studio-built steps but allows renaming them", () => {
    const { page, first, second } = setupWithSteps();
    const handler = first.parent;
    const other = mkInteraction(handler, "dataSourceOp", "Fetch data", {});
    handler.interactions.push(other);

    expect(
      updateInteraction(page, other, {
        action: { actionName: "customFunction", code: "1" },
      })
    ).toEqual(
      err(
        'Interaction "Fetch data" uses the "dataSourceOp" action, which cannot be replaced with this operation; edit it in Studio instead.'
      )
    );

    const renamed = updateInteraction(page, other, { name: "Load data" });
    assert(renamed.isOk(), "expected success result");
    expect(other.interactionName).toEqual("Load data");
    expect(other.actionName).toEqual("dataSourceOp");
    expect(second.interactionName).toEqual("Log");
  });

  it("rejects an empty change set", () => {
    const { page, first } = setupWithSteps();

    expect(updateInteraction(page, first, {})).toEqual(
      err('No changes provided for interaction "Save".')
    );
  });

  it("rejects an empty name and invalid code", () => {
    const { page, first } = setupWithSteps();

    expect(updateInteraction(page, first, { name: " " })).toEqual(
      err("Interaction name cannot be empty.")
    );
    expect(
      updateInteraction(page, first, {
        action: { actionName: "customFunction", code: "const = ;" },
      })
    ).toEqual(err("Interaction code is not valid JavaScript"));
    expect(bodyCode(first)).toMatchObject({ code: "($state.count + 1)" });
  });
});
