import { createComponent } from "@/wab/client/operations/create-component";
import { createComponentState } from "@/wab/client/operations/create-component-state";
import {
  setupComponentWithInstance,
  setupComponentWithTplTree,
} from "@/wab/client/operations/tests/utils";
import { updateComponentState } from "@/wab/client/operations/update-component-state";
import { unwrap } from "@/wab/commons/neverthrow-utils";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { codeLit, customCode, tryExtractJson } from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import { getStateVarName } from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplTag } from "@/wab/shared/model/classes";
import { isNumType } from "@/wab/shared/model/model-util";

describe("updateComponentState", () => {
  function setupWithState() {
    const { site, tplMgr } = setupComponentWithTplTree(
      Tpls.mkTplTagX("div", {})
    );
    const created = createComponent({
      tplMgr,
      name: "StateTest",
      type: ComponentType.Plain,
    });
    const component = unwrap(created);
    const stateResult = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
    });
    return {
      site,
      tplMgr,
      component,
      state: unwrap(stateResult),
      opts: { site, component, tplMgr },
    };
  }

  it("renames the state and its change-handler param", () => {
    const { state, opts } = setupWithState();

    const result = updateComponentState(state, { name: "total" }, opts);

    assert(result.isOk(), "expected success result");
    expect(state).toMatchObject({
      param: { variable: { name: "total" } },
      onChangeParam: { variable: { name: "On total change" } },
    });
  });

  it("changes the variable type and resets the initial value", () => {
    const { state, opts } = setupWithState();

    const result = updateComponentState(
      state,
      { variableType: "number" },
      opts
    );

    assert(result.isOk(), "expected success result");
    expect(state.variableType).toEqual("number");
    expect(isNumType(state.param.type)).toEqual(true);
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual(0);
  });

  it("applies an initial value provided along with a type change", () => {
    const { state, opts } = setupWithState();

    const result = updateComponentState(
      state,
      { variableType: "number", initialValue: codeLit(42) },
      opts
    );

    assert(result.isOk(), "expected success result");
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual(42);
  });

  it("rejects an initial value that does not match the new type, changing nothing", () => {
    const { state, opts } = setupWithState();

    const result = updateComponentState(
      state,
      { variableType: "number", initialValue: codeLit("oops") },
      opts
    );

    assert(result.isErr(), "expected error result");
    expect(state.variableType).toEqual("text");
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual("");
  });

  it("makes a state public and back to private", () => {
    const { state, opts } = setupWithState();

    const toReadonly = updateComponentState(
      state,
      { accessType: "readonly" },
      opts
    );
    assert(toReadonly.isOk(), "expected success result");
    expect(state.accessType).toEqual("readonly");
    expect(state.onChangeParam.exportType).toEqual(ParamExportType.External);

    const toPrivate = updateComponentState(
      state,
      { accessType: "private" },
      opts
    );
    assert(toPrivate.isOk(), "expected success result");
    expect(state.onChangeParam.exportType).toEqual(ParamExportType.ToolsOnly);
  });

  it("blocks making a state writable while its initial value is dynamic", () => {
    const { state, opts } = setupWithState();
    state.param.defaultExpr = customCode("$ctx.locale");

    const blocked = updateComponentState(
      state,
      { accessType: "writable" },
      opts
    );
    assert(blocked.isErr(), "expected error result");
    expect(blocked.error.message).toEqual(
      "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context."
    );
    expect(state.accessType).toEqual("private");

    const replaced = updateComponentState(
      state,
      { accessType: "writable", initialValue: codeLit("en") },
      opts
    );
    assert(replaced.isOk(), "expected success result");
    expect(state.accessType).toEqual("writable");
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual("en");
  });

  it("clears the initial value with null", () => {
    const { state, opts } = setupWithState();
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual("");

    const result = updateComponentState(state, { initialValue: null }, opts);

    assert(result.isOk(), "expected success result");
    expect(state.param.defaultExpr).toBeNull();
  });

  it("sets an expression initial value", () => {
    const { state, opts } = setupWithState();
    const expr = customCode("$ctx.locale");

    const result = updateComponentState(state, { initialValue: expr }, opts);

    assert(result.isOk(), "expected success result");
    expect(state.param.defaultExpr).toBe(expr);
  });

  it("blocks an expression initial value on a read-and-write state", () => {
    const { state, opts } = setupWithState();
    const madeWritable = updateComponentState(
      state,
      { accessType: "writable" },
      opts
    );
    assert(madeWritable.isOk(), "setup failed");

    const result = updateComponentState(
      state,
      { initialValue: customCode("$ctx.locale") },
      opts
    );

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context."
    );
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual("");
  });

  it("blocks making a state private while other components reference it", () => {
    const { site, tplMgr, page, button, instance } =
      setupComponentWithInstance();
    const opts = { site, component: button, tplMgr };
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "count",
      accessType: "readonly",
    });
    const state = unwrap(created);

    // Reference the implicit copy from the containing page.
    const implicitState = page.states.find(
      (s) => s.implicitState === state && s.tplNode === instance
    );
    assert(implicitState, "expected an implicit state on the page");
    const pageRoot = page.tplTree as TplTag;
    const vs = ensureVariantSetting(pageRoot, [getBaseVariant(page)]);
    vs.attrs["title"] = customCode(`$state.${getStateVarName(implicitState)}`);

    const result = updateComponentState(state, { accessType: "private" }, opts);

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      "Variable is referenced in UnnamedComponent."
    );
    expect(state.accessType).toEqual("readonly");
  });

  it("only allows accessType changes on implicit states", () => {
    const { site, tplMgr, page, button, instance } =
      setupComponentWithInstance();
    const created = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "count",
      accessType: "readonly",
    });
    const state = unwrap(created);
    const implicitState = page.states.find(
      (s) => s.implicitState === state && s.tplNode === instance
    );
    assert(implicitState, "expected an implicit state on the page");
    const opts = { site, component: page, tplMgr };

    const renamed = updateComponentState(
      implicitState,
      { name: "renamed" },
      opts
    );
    assert(renamed.isErr(), "expected error result");
    expect(renamed.error.message).toEqual(
      'State "button.count2" is an implicit state of element "Button"; only its access type can be changed.'
    );

    const exposed = updateComponentState(
      implicitState,
      { accessType: "readonly" },
      opts
    );
    assert(exposed.isOk(), "expected success result");
    expect(implicitState.accessType).toEqual("readonly");
  });

  it("only allows accessType and initial value changes on variant-group states", () => {
    const { site, tplMgr, button, sizeGroup } = setupComponentWithInstance();
    const state = sizeGroup.linkedState;
    const opts = { site, component: button, tplMgr };

    const renamed = updateComponentState(state, { name: "kind" }, opts);

    assert(renamed.isErr(), "expected error result");
    expect(renamed.error.message).toEqual(
      'State "size" backs a variant group; only its access type and initial value can be changed.'
    );
    expect(state.param.variable.name).toEqual("size");

    const retyped = updateComponentState(state, { variableType: "text" }, opts);

    assert(retyped.isErr(), "expected error result");
    expect(state.variableType).toEqual("variant");
  });

  it("sets and clears a variant group's initial value", () => {
    const { site, tplMgr, button, sizeGroup } = setupComponentWithInstance();
    const state = sizeGroup.linkedState;
    const opts = { site, component: button, tplMgr };

    const dynamic = updateComponentState(
      state,
      { initialValue: customCode("$ctx.density") },
      opts
    );
    assert(dynamic.isOk(), "expected success result");
    expect(state.param.defaultExpr).not.toBeNull();

    const cleared = updateComponentState(state, { initialValue: null }, opts);
    assert(cleared.isOk(), "expected success result");
    expect(state.param.defaultExpr).toBeNull();
  });

  it("flags initial values that name unknown variants", () => {
    const { site, tplMgr, button, sizeGroup, featuresGroup } =
      setupComponentWithInstance();
    const opts = { site, component: button, tplMgr };

    const unknownChoice = updateComponentState(
      sizeGroup.linkedState,
      { initialValue: codeLit("huge") },
      opts
    );
    assert(unknownChoice.isErr(), "expected error result");
    expect(unknownChoice.error.message).toEqual(
      'Initial value refers to "huge", which is not a variant of group "size"; expected values: "small", "large".'
    );

    const unknownInList = updateComponentState(
      featuresGroup.linkedState,
      { initialValue: codeLit(["rounded", "wat"]) },
      opts
    );
    assert(unknownInList.isErr(), "expected error result");
    expect(unknownInList.error.message).toEqual(
      'Initial value refers to "wat", which is not a variant of group "features"; expected values: "rounded", "shadow".'
    );
  });

  it("accepts the value shapes the runtime interprets", () => {
    const { site, tplMgr, button, sizeGroup, featuresGroup, darkGroup } =
      setupComponentWithInstance();
    const opts = { site, component: button, tplMgr };

    const choiceByName = updateComponentState(
      sizeGroup.linkedState,
      { initialValue: codeLit("small") },
      opts
    );
    assert(choiceByName.isOk(), "expected success result");
    expect(tryExtractJson(sizeGroup.linkedState.param.defaultExpr!)).toEqual(
      "small"
    );

    const multiAsList = updateComponentState(
      featuresGroup.linkedState,
      { initialValue: codeLit(["rounded"]) },
      opts
    );
    assert(multiAsList.isOk(), "expected success result");

    const multiAsBareName = updateComponentState(
      featuresGroup.linkedState,
      { initialValue: codeLit("rounded") },
      opts
    );
    assert(multiAsBareName.isOk(), "expected success result");

    const toggleAsBoolean = updateComponentState(
      darkGroup.linkedState,
      { initialValue: codeLit(true) },
      opts
    );
    assert(toggleAsBoolean.isOk(), "expected success result");

    const toggleByName = updateComponentState(
      darkGroup.linkedState,
      { initialValue: codeLit("dark") },
      opts
    );
    assert(toggleByName.isOk(), "expected success result");
  });

  it("blocks a dynamic initial value on a read-and-write variant group", () => {
    const { site, tplMgr, button, sizeGroup } = setupComponentWithInstance();
    const state = sizeGroup.linkedState;
    const opts = { site, component: button, tplMgr };
    const madeWritable = updateComponentState(
      state,
      { accessType: "writable" },
      opts
    );
    assert(madeWritable.isOk(), "setup failed");

    const result = updateComponentState(
      state,
      { initialValue: customCode("$ctx.density") },
      opts
    );

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context."
    );
    expect(state.param.defaultExpr).toBeFalsy();
  });

  it("blocks making a variant group read-and-write while its initial value is dynamic", () => {
    const { site, tplMgr, button, sizeGroup } = setupComponentWithInstance();
    const state = sizeGroup.linkedState;
    const opts = { site, component: button, tplMgr };
    const setDynamic = updateComponentState(
      state,
      { initialValue: customCode("$ctx.density") },
      opts
    );
    assert(setDynamic.isOk(), "setup failed");

    const result = updateComponentState(
      state,
      { accessType: "writable" },
      opts
    );

    assert(result.isErr(), "expected error result");
    expect(state.accessType).toEqual("private");
  });

  it("makes a variant group public and back to private through its linked state", () => {
    const { site, tplMgr, page, button, instance, sizeGroup } =
      setupComponentWithInstance();
    const state = sizeGroup.linkedState;
    const opts = { site, component: button, tplMgr };

    const exposed = updateComponentState(
      state,
      { accessType: "readonly" },
      opts
    );

    assert(exposed.isOk(), "expected success result");
    expect(state.accessType).toEqual("readonly");
    expect(state.onChangeParam.exportType).toEqual(ParamExportType.External);
    expect(
      page.states.some(
        (s) => s.implicitState === state && s.tplNode === instance
      )
    ).toEqual(true);

    const hidden = updateComponentState(state, { accessType: "private" }, opts);

    assert(hidden.isOk(), "expected success result");
    expect(state.accessType).toEqual("private");
    expect(page.states.some((s) => s.implicitState === state)).toEqual(false);
  });

  it("rejects an empty change set", () => {
    const { state, opts } = setupWithState();

    const result = updateComponentState(state, {}, opts);

    expect(result.isErr()).toBe(true);
  });
});
