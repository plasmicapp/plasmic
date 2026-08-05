import { createInteraction } from "@/wab/client/operations/create-interaction";
import { setupComponentWithInstance } from "@/wab/client/operations/tests/utils";
import {
  ensureBaseVariantSetting,
  ensureVariantSetting,
  getBaseVariant,
} from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import { customCode } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import {
  TplTag,
  isKnownEventHandler,
  isKnownFunctionExpr,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { err } from "neverthrow";

describe("createInteraction", () => {
  function setup() {
    const fixture = setupComponentWithInstance();
    const root = fixture.page.tplTree as TplTag;
    ensureVariantSetting(root, [getBaseVariant(fixture.page)]);
    return { ...fixture, root };
  }

  function getHandler(tpl: TplTag, attr: string) {
    const expr = ensureBaseVariantSetting(tpl).attrs[attr];
    assert(isKnownEventHandler(expr), "expected an EventHandler");
    return expr;
  }

  it("creates a run-code interaction on a tag event", () => {
    const { page, root } = setup();

    const result = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "Log click",
      action: { actionName: "customFunction", code: 'console.log("hi")' },
    });

    assert(result.isOk(), "expected success result");
    const handler = getHandler(root, "onClick");
    expect(handler.interactions).toHaveLength(1);
    expect(result.value).toBe(handler.interactions[0]);
    expect(result.value).toMatchObject({
      actionName: "customFunction",
      interactionName: "Log click",
      conditionalMode: "always",
    });
    expect(result.value.parent).toBe(handler);
    const arg = result.value.args.find((a) => a.name === "customFunction");
    assert(arg && isKnownFunctionExpr(arg.expr), "expected a FunctionExpr arg");
    expect(arg.expr.argNames).toEqual([]);
    expect(arg.expr.bodyExpr).toMatchObject({
      code: '(console.log("hi"))',
    });
  });

  it("appends to an existing handler with a deduped name", () => {
    const { page, root } = setup();

    const first = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "Log",
      action: { actionName: "customFunction", code: "console.log(1)" },
    });
    const second = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "Log",
      action: { actionName: "customFunction", code: "console.log(2)" },
    });

    assert(first.isOk(), "expected success result");
    assert(second.isOk(), "expected success result");
    const handler = getHandler(root, "onClick");
    expect(handler.interactions.map((it) => it.interactionName)).toEqual([
      "Log",
      "Log 2",
    ]);
  });

  it("dedupes names that collide after $steps normalization", () => {
    const { page, root } = setup();

    const first = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "saveStep",
      action: { actionName: "customFunction", code: "1" },
    });
    const second = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "Save step",
      action: { actionName: "customFunction", code: "2" },
    });

    assert(first.isOk(), "expected success result");
    assert(second.isOk(), "expected success result");
    expect(second.value.interactionName).toEqual("Save step 2");
    const varNames = getHandler(root, "onClick").interactions.map((it) =>
      toVarName(it.interactionName)
    );
    expect(new Set(varNames).size).toEqual(varNames.length);
  });

  it("supports multi-statement code", () => {
    const { page, root } = setup();

    const result = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "Save draft",
      action: {
        actionName: "customFunction",
        code: "const draft = $state.text;\nawait $props.onSave(draft);",
      },
    });

    assert(result.isOk(), "expected success result");
    expect(result.value.interactionName).toEqual("Save draft");
  });

  it("creates on a component instance's function-typed prop", () => {
    const { page, button, instance } = setup();
    button.params.push(
      mkParam({ name: "onSave", type: typeFactory.func(), paramType: "prop" })
    );

    const result = createInteraction({
      component: page,
      tpl: instance,
      eventName: "onSave",
      name: "Reset count",
      action: { actionName: "customFunction", code: "$state.count = 0" },
    });

    assert(result.isOk(), "expected success result");
    const arg = ensureBaseVariantSetting(instance).args.find(
      (a) => a.param.variable.name === "onSave"
    );
    assert(arg && isKnownEventHandler(arg.expr), "expected handler arg");
    expect(arg.expr.interactions).toHaveLength(1);
  });

  it("rejects an unknown event", () => {
    const { page, root } = setup();

    const result = createInteraction({
      component: page,
      tpl: root,
      eventName: "onTeleport",
      name: "Nope",
      action: { actionName: "customFunction", code: "1" },
    });

    assert(result.isErr(), "expected error result");
    expect(result.error).toMatch(
      /^Event "onTeleport" is not available on this element\. Available events: /
    );
  });

  it("rejects empty code", () => {
    const { page, root } = setup();

    const result = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "Blank",
      action: { actionName: "customFunction", code: "  " },
    });

    expect(result).toEqual(err("Interaction code cannot be empty."));
  });

  it("rejects invalid JavaScript", () => {
    const { page, root } = setup();

    const result = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "Broken",
      action: { actionName: "customFunction", code: "const = ;" },
    });

    expect(result).toEqual(err("Interaction code is not valid JavaScript"));
  });

  it("rejects a slot occupied by a custom expression", () => {
    const { page, root } = setup();
    ensureBaseVariantSetting(root).attrs["onClick"] =
      customCode("$props.onClick");

    const result = createInteraction({
      component: page,
      tpl: root,
      eventName: "onClick",
      name: "Log",
      action: { actionName: "customFunction", code: "1" },
    });

    expect(result).toEqual(
      err(
        'The "onClick" handler of this element is a custom expression, not an interaction list; edit it in Studio instead.'
      )
    );
  });
});
