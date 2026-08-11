import { createComponent } from "@/wab/client/operations/create-component";
import { createComponentState } from "@/wab/client/operations/create-component-state";
import {
  setupComponentWithInstance,
  setupComponentWithTplTree,
} from "@/wab/client/operations/tests/utils";
import { unwrap } from "@/wab/commons/neverthrow-utils";
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
    return { site, tplMgr, component: unwrap(created) };
  }

  it("creates a private text state with defaults", () => {
    const { site, tplMgr, component } = setupWithComponent();

    const result = createComponentState({
      site,
      component,
      tplMgr,
      name: "count",
    });

    assert(result.isOk(), "expected success result");
    const state = result.value;
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

    assert(result.isOk(), "expected success result");
    const state = result.value;
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

    assert(first.isOk(), "expected success result");
    assert(second.isOk(), "expected success result");
    expect(second.value.param.variable.name).toEqual("count 2");
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

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toContain('not valid for a "number" state');
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

    assert(result.isOk(), "expected success result");
    expect(tryExtractJson(result.value.param.defaultExpr!)).toEqual("");
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

    assert(result.isOk(), "expected success result");
    expect(result.value.param.defaultExpr).toBe(expr);
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

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context."
    );
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

    expect(result.isErr()).toBe(true);
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

    assert(result.isOk(), "expected success result");
    expect(page.states).toMatchObject([
      { implicitState: result.value, tplNode: instance },
    ]);
    // Instances holding public states must be named for `$state` paths.
    expect(instance.name).toBeTruthy();
  });
});
