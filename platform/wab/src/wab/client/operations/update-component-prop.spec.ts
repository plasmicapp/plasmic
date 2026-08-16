import { createComponentState } from "@/wab/client/operations/create-component-state";
import { setupComponentWithInstance } from "@/wab/client/operations/tests/utils";
import { updateComponentProp } from "@/wab/client/operations/update-component-prop";
import { assert, ensure } from "@/wab/shared/common";
import { codeLit, customCode, tryExtractJson } from "@/wab/shared/core/exprs";
import { Param, isKnownPropParam } from "@/wab/shared/model/classes";

describe("updateComponentProp", () => {
  function setup() {
    const fixture = setupComponentWithInstance();
    const findParam = (name: string): Param =>
      ensure(
        fixture.button.params.find((p) => p.variable.name === name),
        `param "${name}" must exist`
      );
    return {
      ...fixture,
      findParam,
      opts: { component: fixture.button, tplMgr: fixture.tplMgr },
    };
  }

  it("renames the prop", () => {
    const { findParam, opts } = setup();
    const param = findParam("label");

    const result = updateComponentProp(param, { name: "caption" }, opts);

    assert(result.isOk(), "expected success result");
    expect(param.variable.name).toEqual("caption");
  });

  it("sets and clears the default value", () => {
    const { findParam, opts } = setup();
    const param = findParam("label");

    const set = updateComponentProp(
      param,
      { defaultValue: codeLit("hi") },
      opts
    );
    assert(set.isOk(), "expected success result");
    expect(tryExtractJson(param.defaultExpr!)).toEqual("hi");

    const cleared = updateComponentProp(param, { defaultValue: null }, opts);
    assert(cleared.isOk(), "expected success result");
    expect(param.defaultExpr).toBeNull();
  });

  it("replaces choice options and validates the default against them", () => {
    const { findParam, opts } = setup();
    const param = findParam("tone");

    const result = updateComponentProp(
      param,
      { options: ["primary", "danger"], defaultValue: codeLit("danger") },
      opts
    );

    assert(result.isOk(), "expected success result");
    expect(param.type).toMatchObject({ options: ["primary", "danger"] });
    expect(tryExtractJson(param.defaultExpr!)).toEqual("danger");
  });

  it("rejects an options change that strands the stored default value", () => {
    const { findParam, opts } = setup();
    const param = findParam("tone");

    const set = updateComponentProp(
      param,
      { defaultValue: codeLit("primary") },
      opts
    );
    assert(set.isOk(), "expected success result");

    const result = updateComponentProp(
      param,
      { options: ["muted", "danger"] },
      opts
    );

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Default value "primary" is not among the allowed options for this "choice" prop. Provide defaultValue together with the new options (null unsets it).'
    );
    expect(param.type).toMatchObject({ options: ["primary", "secondary"] });
    expect(tryExtractJson(param.defaultExpr!)).toEqual("primary");
  });

  it("allows an options change when the stored default remains valid", () => {
    const { findParam, opts } = setup();
    const param = findParam("tone");

    const set = updateComponentProp(
      param,
      { defaultValue: codeLit("primary") },
      opts
    );
    assert(set.isOk(), "expected success result");

    const result = updateComponentProp(
      param,
      { options: ["primary", "muted"] },
      opts
    );

    assert(result.isOk(), "expected success result");
    expect(param.type).toMatchObject({ options: ["primary", "muted"] });
    expect(tryExtractJson(param.defaultExpr!)).toEqual("primary");
  });

  it("rejects a default that does not match the type", () => {
    const { findParam, opts } = setup();
    const param = findParam("count");

    const result = updateComponentProp(
      param,
      { defaultValue: codeLit("oops") },
      opts
    );

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Default value "oops" is not valid for a "num" prop.'
    );
    expect(param.defaultExpr).toBeUndefined();
  });

  it("sets a dynamic default value", () => {
    const { findParam, opts } = setup();
    const param = findParam("count");
    const expr = customCode("$ctx.pageSize");

    const result = updateComponentProp(param, { defaultValue: expr }, opts);

    assert(result.isOk(), "expected success result");
    expect(param.defaultExpr).toBe(expr);
  });

  it("edits the value and onChange params of a read-and-write state as props", () => {
    const { site, tplMgr, button, opts } = setup();
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "query",
      accessType: "writable",
    });
    assert(created.isOk(), "state setup failed");
    const param = created.value.param;

    const set = updateComponentProp(
      param,
      { defaultValue: codeLit("initial") },
      opts
    );
    assert(set.isOk(), "expected success result");
    expect(tryExtractJson(param.defaultExpr!)).toEqual("initial");

    const dynamic = updateComponentProp(
      param,
      { defaultValue: customCode("$props.label") },
      opts
    );
    assert(dynamic.isErr(), "expected error result");
    expect(dynamic.error.message).toEqual(
      "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context."
    );

    const renamedHandler = updateComponentProp(
      created.value.onChangeParam,
      { name: "onQueryUpdated" },
      opts
    );
    assert(renamedHandler.isOk(), "expected success result");
    expect(created.value.onChangeParam.variable.name).toEqual("onQueryUpdated");
  });

  it("renames the change handler of a read-only state", () => {
    const { site, tplMgr, button, opts } = setup();
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "status",
      accessType: "readonly",
    });
    assert(created.isOk(), "state setup failed");

    const renamed = updateComponentProp(
      created.value.onChangeParam,
      { name: "onStatusChanged" },
      opts
    );
    assert(renamed.isOk(), "expected success result");
    expect(created.value.onChangeParam.variable.name).toEqual(
      "onStatusChanged"
    );
  });

  it("sets preview value, advanced, and isLocalizable", () => {
    const { findParam, opts } = setup();
    const param = findParam("label");

    const result = updateComponentProp(
      param,
      { previewValue: codeLit("Preview"), advanced: true, isLocalizable: true },
      opts
    );

    assert(result.isOk(), "expected success result");
    assert(isKnownPropParam(param), "expected a prop param");
    expect(param.advanced).toEqual(true);
    expect(param.isLocalizable).toEqual(true);
    expect(tryExtractJson(param.previewExpr!)).toEqual("Preview");

    const cleared = updateComponentProp(param, { previewValue: null }, opts);
    assert(cleared.isOk(), "expected success result");
    expect(param.previewExpr).toBeNull();
  });

  it("rejects options on a non-choice prop", () => {
    const { findParam, opts } = setup();
    const param = findParam("label");

    const result = updateComponentProp(param, { options: ["a"] }, opts);

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Prop "label" is not a choice or multiChoice prop, so it has no options.'
    );
  });

  it("rejects params that are not plain props", () => {
    const { site, tplMgr, button, sizeGroup, findParam, opts } = setup();
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "visits",
    });
    assert(created.isOk(), "state setup failed");

    expect(
      updateComponentProp(
        created.value.param,
        { name: "x" },
        opts
      )._unsafeUnwrapErr().message
    ).toEqual(
      'Param "visits" is a state value param; manage it through state operations.'
    );
    expect(
      updateComponentProp(
        created.value.onChangeParam,
        { name: "x" },
        opts
      )._unsafeUnwrapErr().message
    ).toEqual(
      'Param "On visits change" is a state change handler; it is derived from its state.'
    );
    expect(
      updateComponentProp(
        findParam("children"),
        { name: "x" },
        opts
      )._unsafeUnwrapErr().message
    ).toEqual(
      'Param "children" is a slot; slots are managed through the element tree.'
    );
    expect(
      updateComponentProp(
        sizeGroup.param,
        { name: "x" },
        opts
      )._unsafeUnwrapErr().message
    ).toEqual(
      'Param "size" backs a variant group; manage it through variant group operations.'
    );
  });

  it("rejects an empty change set", () => {
    const { findParam, opts } = setup();

    const result = updateComponentProp(findParam("label"), {}, opts);

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'No changes provided for prop "label".'
    );
  });
});
