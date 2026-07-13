import { createComponent } from "@/wab/client/operations/create-component";
import { createComponentState } from "@/wab/client/operations/create-component-state";
import {
  setupComponentWithInstance,
  setupComponentWithTplTree,
} from "@/wab/client/operations/tests/utils";
import { updateComponentState } from "@/wab/client/operations/update-component-state";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { codeLit, customCode, tryExtractJson } from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import { getStateVarName } from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplTag, isKnownVariantGroupState } from "@/wab/shared/model/classes";
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
    assert(created.result === "success", "setup failed");
    const component = created.component;
    const stateResult = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
    });
    assert(stateResult.result === "success", "state setup failed");
    return {
      site,
      tplMgr,
      component,
      state: stateResult.state,
      opts: { site, component, tplMgr },
    };
  }

  it("renames the state and its change-handler param", () => {
    const { state, opts } = setupWithState();

    const result = updateComponentState(state, { name: "total" }, opts);

    assert(result.result === "success", "expected success result");
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

    assert(result.result === "success", "expected success result");
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

    assert(result.result === "success", "expected success result");
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual(42);
  });

  it("rejects an initial value that does not match the new type, changing nothing", () => {
    const { state, opts } = setupWithState();

    const result = updateComponentState(
      state,
      { variableType: "number", initialValue: codeLit("oops") },
      opts
    );

    assert(result.result === "error", "expected error result");
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
    assert(toReadonly.result === "success", "expected success result");
    expect(state.accessType).toEqual("readonly");
    expect(state.onChangeParam.exportType).toEqual(ParamExportType.External);

    const toPrivate = updateComponentState(
      state,
      { accessType: "private" },
      opts
    );
    assert(toPrivate.result === "success", "expected success result");
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
    expect(blocked).toMatchObject({
      result: "error",
      message:
        "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context.",
    });
    expect(state.accessType).toEqual("private");

    const replaced = updateComponentState(
      state,
      { accessType: "writable", initialValue: codeLit("en") },
      opts
    );
    assert(replaced.result === "success", "expected success result");
    expect(state.accessType).toEqual("writable");
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual("en");
  });

  it("clears the initial value with null", () => {
    const { state, opts } = setupWithState();
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual("");

    const result = updateComponentState(state, { initialValue: null }, opts);

    assert(result.result === "success", "expected success result");
    expect(state.param.defaultExpr).toBeNull();
  });

  it("sets an expression initial value", () => {
    const { state, opts } = setupWithState();
    const expr = customCode("$ctx.locale");

    const result = updateComponentState(state, { initialValue: expr }, opts);

    assert(result.result === "success", "expected success result");
    expect(state.param.defaultExpr).toBe(expr);
  });

  it("blocks an expression initial value on a read-and-write state", () => {
    const { state, opts } = setupWithState();
    const madeWritable = updateComponentState(
      state,
      { accessType: "writable" },
      opts
    );
    assert(madeWritable.result === "success", "setup failed");

    const result = updateComponentState(
      state,
      { initialValue: customCode("$ctx.locale") },
      opts
    );

    expect(result).toMatchObject({
      result: "error",
      message:
        "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context.",
    });
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
    assert(created.result === "success", "state setup failed");
    const state = created.state;

    // Reference the implicit copy from the containing page.
    const implicitState = page.states.find(
      (s) => s.implicitState === state && s.tplNode === instance
    );
    assert(implicitState, "expected an implicit state on the page");
    const pageRoot = page.tplTree as TplTag;
    const vs = ensureVariantSetting(pageRoot, [getBaseVariant(page)]);
    vs.attrs["title"] = customCode(`$state.${getStateVarName(implicitState)}`);

    const result = updateComponentState(state, { accessType: "private" }, opts);

    expect(result).toMatchObject({
      result: "error",
      message: "Variable is referenced in UnnamedComponent.",
    });
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
    assert(created.result === "success", "state setup failed");
    const implicitState = page.states.find(
      (s) => s.implicitState === created.state && s.tplNode === instance
    );
    assert(implicitState, "expected an implicit state on the page");
    const opts = { site, component: page, tplMgr };

    const renamed = updateComponentState(
      implicitState,
      { name: "renamed" },
      opts
    );
    expect(renamed).toMatchObject({
      result: "error",
      message:
        'State "button.count2" is an implicit state of element "Button"; only its access type can be changed.',
    });

    const exposed = updateComponentState(
      implicitState,
      { accessType: "readonly" },
      opts
    );
    assert(exposed.result === "success", "expected success result");
    expect(implicitState.accessType).toEqual("readonly");
  });

  it("rejects variant-group states", () => {
    const { site, tplMgr, button } = setupComponentWithInstance();
    const variantGroupState = button.states.find((s) =>
      isKnownVariantGroupState(s)
    );
    assert(variantGroupState, "expected a variant-group state");

    const result = updateComponentState(
      variantGroupState,
      { accessType: "readonly" },
      { site, component: button, tplMgr }
    );

    expect(result).toMatchObject({
      result: "error",
      message:
        'State "size" backs a variant group; manage it through variant group operations.',
    });
  });

  it("rejects an empty change set", () => {
    const { state, opts } = setupWithState();

    const result = updateComponentState(state, {}, opts);

    expect(result.result).toEqual("error");
  });
});
