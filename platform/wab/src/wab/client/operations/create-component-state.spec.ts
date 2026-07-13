import { createComponent } from "@/wab/client/operations/create-component";
import { createComponentState } from "@/wab/client/operations/create-component-state";
import {
  setupComponentWithInstance,
  setupComponentWithTplTree,
} from "@/wab/client/operations/tests/utils";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { codeLit, customCode, tryExtractJson } from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import * as Tpls from "@/wab/shared/core/tpls";

describe("createComponentState", () => {
  function setupWithComponent() {
    const { site, tplMgr } = setupComponentWithTplTree(
      Tpls.mkTplTagX("div", {})
    );
    const created = createComponent({
      tplMgr,
      name: "StateTest",
      type: ComponentType.Plain,
    });
    assert(created.result === "success", "setup failed");
    return { site, tplMgr, component: created.component };
  }

  it("creates a private text state with defaults", () => {
    const { site, tplMgr, component } = setupWithComponent();

    const result = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
    });

    assert(result.result === "success", "expected success result");
    const state = result.state;
    expect(state).toMatchObject({
      variableType: "text",
      accessType: "private",
      param: {
        variable: { name: "count" },
        exportType: ParamExportType.ToolsOnly,
      },
      onChangeParam: {
        variable: { name: "On count change" },
        exportType: ParamExportType.ToolsOnly,
      },
    });
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual("");
    expect(component.states).toContain(state);
    expect(component.params).toContain(state.param);
    expect(component.params).toContain(state.onChangeParam);
  });

  it("creates a writable number state with an initial value", () => {
    const { site, tplMgr, component } = setupWithComponent();

    const result = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
      variableType: "number",
      accessType: "writable",
      initialValue: codeLit(5),
    });

    assert(result.result === "success", "expected success result");
    const state = result.state;
    expect(state).toMatchObject({
      variableType: "number",
      accessType: "writable",
      param: { exportType: ParamExportType.External },
      onChangeParam: { exportType: ParamExportType.External },
    });
    expect(tryExtractJson(state.param.defaultExpr!)).toEqual(5);
  });

  it("dedupes duplicate names", () => {
    const { site, tplMgr, component } = setupWithComponent();

    const first = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
    });
    const second = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
    });

    assert(first.result === "success", "expected success result");
    assert(second.result === "success", "expected success result");
    expect(second.state.param.variable.name).toEqual("count 2");
  });

  it("rejects an initial value that does not match the variable type", () => {
    const { site, tplMgr, component } = setupWithComponent();

    const result = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
      variableType: "number",
      initialValue: codeLit("not a number"),
    });

    assert(result.result === "error", "expected error result");
    expect(result.message).toContain('not valid for a "number" state');
    expect(component.states).toHaveLength(0);
  });

  it("falls back to the type default when initialValue is null", () => {
    const { site, tplMgr, component } = setupWithComponent();

    const result = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
      initialValue: null,
    });

    assert(result.result === "success", "expected success result");
    expect(tryExtractJson(result.state.param.defaultExpr!)).toEqual("");
  });

  it("creates a state with an expression initial value", () => {
    const { site, tplMgr, component } = setupWithComponent();
    const expr = customCode("$ctx.locale");

    const result = createComponentState({
      site,
      component,
      tplMgr,
      name: "locale",
      initialValue: expr,
    });

    assert(result.result === "success", "expected success result");
    expect(result.state.param.defaultExpr).toBe(expr);
  });

  it("rejects a writable state with an expression initial value", () => {
    const { site, tplMgr, component } = setupWithComponent();

    const result = createComponentState({
      site,
      component,
      tplMgr,
      name: "locale",
      accessType: "writable",
      initialValue: customCode("$ctx.locale"),
    });

    expect(result).toMatchObject({
      result: "error",
      message:
        "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context.",
    });
    expect(component.states).toHaveLength(0);
  });

  it("rejects an empty name", () => {
    const { site, tplMgr, component } = setupWithComponent();

    const result = createComponentState({
      site,
      component,
      tplMgr,
      name: "  ",
    });

    expect(result.result).toEqual("error");
  });

  it("propagates an implicit state to instances when the state is public", () => {
    const { site, tplMgr, page, button, instance } =
      setupComponentWithInstance();

    const result = createComponentState({
      site,
      component: button,
      tplMgr,
      name: "count",
      accessType: "readonly",
    });

    assert(result.result === "success", "expected success result");
    expect(page.states).toMatchObject([
      { implicitState: result.state, tplNode: instance },
    ]);
    // Instances holding public states must be named for `$state` paths.
    expect(instance.name).toBeTruthy();
  });
});
