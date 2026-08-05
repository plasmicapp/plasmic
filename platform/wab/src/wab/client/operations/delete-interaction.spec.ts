import { createInteraction } from "@/wab/client/operations/create-interaction";
import { deleteInteraction } from "@/wab/client/operations/delete-interaction";
import { setupComponentWithInstance } from "@/wab/client/operations/tests/utils";
import {
  ensureBaseVariantSetting,
  ensureVariantSetting,
  getBaseVariant,
} from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { mkParam } from "@/wab/shared/core/lang";
import { TplTag } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { err } from "neverthrow";

describe("deleteInteraction", () => {
  function setup() {
    const fixture = setupComponentWithInstance();
    const root = fixture.page.tplTree as TplTag;
    ensureVariantSetting(root, [getBaseVariant(fixture.page)]);
    return { ...fixture, root };
  }

  function addStep(
    fixture: ReturnType<typeof setup>,
    name: string,
    code: string
  ) {
    const result = createInteraction({
      component: fixture.page,
      tpl: fixture.root,
      eventName: "onClick",
      name,
      action: { actionName: "customFunction", code },
    });
    assert(result.isOk(), "setup failed");
    return result.value;
  }

  it("deletes a step and keeps the handler for remaining steps", () => {
    const fixture = setup();
    const first = addStep(fixture, "Save", "1");
    const second = addStep(fixture, "Log", "2");

    const result = deleteInteraction({
      tpl: fixture.root,
      eventHandlerKey: { attr: "onClick" },
      interaction: second,
    });

    assert(result.isOk(), "expected success result");
    expect(first.parent.interactions).toEqual([first]);
    expect(
      ensureBaseVariantSetting(fixture.root).attrs["onClick"]
    ).toBeDefined();
  });

  it("removes the handler slot when the last step is deleted", () => {
    const fixture = setup();
    const only = addStep(fixture, "Save", "1");

    const result = deleteInteraction({
      tpl: fixture.root,
      eventHandlerKey: { attr: "onClick" },
      interaction: only,
    });

    assert(result.isOk(), "expected success result");
    expect(
      ensureBaseVariantSetting(fixture.root).attrs["onClick"]
    ).toBeUndefined();
  });

  it("removes the arg slot for component instance handlers", () => {
    const fixture = setup();
    fixture.button.params.push(
      mkParam({ name: "onSave", type: typeFactory.func(), paramType: "prop" })
    );
    const created = createInteraction({
      component: fixture.page,
      tpl: fixture.instance,
      eventName: "onSave",
      name: "Save",
      action: { actionName: "customFunction", code: "1" },
    });
    assert(created.isOk(), "setup failed");
    const param = fixture.button.params.find(
      (p) => p.variable.name === "onSave"
    )!;

    const result = deleteInteraction({
      tpl: fixture.instance,
      eventHandlerKey: { param },
      interaction: created.value,
    });

    assert(result.isOk(), "expected success result");
    expect(
      ensureBaseVariantSetting(fixture.instance).args.find(
        (a) => a.param === param
      )
    ).toBeUndefined();
  });

  it("blocks deleting a step that a sibling step reads via $steps", () => {
    const fixture = setup();
    const first = addStep(fixture, "Save", "$state.count + 1");
    addStep(fixture, "Log", "console.log($steps.save)");

    const result = deleteInteraction({
      tpl: fixture.root,
      eventHandlerKey: { attr: "onClick" },
      interaction: first,
    });

    expect(result).toEqual(
      err(
        'Interaction "Save" cannot be deleted: step "Log" reads its result via $steps.'
      )
    );
    expect(first.parent.interactions).toHaveLength(2);
  });
});
