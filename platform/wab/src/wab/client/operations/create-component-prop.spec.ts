import { createComponent } from "@/wab/client/operations/create-component";
import { createComponentProp } from "@/wab/client/operations/create-component-prop";
import { setupComponentWithTplTree } from "@/wab/client/operations/tests/utils";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { codeLit, customCode, tryExtractJson } from "@/wab/shared/core/exprs";
import { ParamExportType } from "@/wab/shared/core/lang";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  isKnownFunctionType,
  isKnownPropParam,
} from "@/wab/shared/model/classes";
import { mkWabTypeForPropKind } from "@/wab/shared/model/prop-type-config";

describe("createComponentProp", () => {
  function setupWithComponent() {
    const { site, tplMgr } = setupComponentWithTplTree(
      Tpls.mkTplTagX("div", {})
    );
    const created = createComponent({
      tplMgr,
      name: "PropTest",
      type: ComponentType.Plain,
    });
    assert(created.isOk(), "setup failed");
    return { site, tplMgr, component: created.value };
  }

  it("creates a text prop with defaults", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "subtitle",
      type: mkWabTypeForPropKind("text"),
    });

    assert(result.isOk(), "expected success result");
    const param = result.value;
    expect(isKnownPropParam(param)).toEqual(true);
    expect(param).toMatchObject({
      variable: { name: "subtitle" },
      exportType: ParamExportType.External,
      type: { name: "text" },
      description: "metaProp",
      advanced: false,
      isLocalizable: false,
    });
    expect(param.defaultExpr).toBeUndefined();
    expect(param.previewExpr).toBeUndefined();
    expect(component.params).toContain(param);
  });

  it("creates a choice prop with options and a valid default", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "tone",
      type: mkWabTypeForPropKind("choice", {
        options: ["primary", "secondary"],
      }),
      defaultValue: codeLit("primary"),
    });

    assert(result.isOk(), "expected success result");
    expect(result.value.type).toMatchObject({
      name: "choice",
      options: ["primary", "secondary"],
    });
    expect(tryExtractJson(result.value.defaultExpr!)).toEqual("primary");
  });

  it("accepts a boolean default for a boolean choice prop", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "wraps",
      type: mkWabTypeForPropKind("choice", { options: [true, false] }),
      defaultValue: codeLit(true),
    });

    assert(result.isOk(), "expected success result");
    expect(tryExtractJson(result.value.defaultExpr!)).toEqual(true);
  });

  it("keeps labeled options and matches a default against their values", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "columns",
      type: mkWabTypeForPropKind("choice", {
        options: [
          { label: "One column", value: 1 },
          { label: "Two columns", value: 2 },
        ],
      }),
      defaultValue: codeLit(2),
    });

    assert(result.isOk(), "expected success result");
    expect(result.value.type).toMatchObject({
      options: [
        { label: "One column", value: 1 },
        { label: "Two columns", value: 2 },
      ],
    });
    expect(tryExtractJson(result.value.defaultExpr!)).toEqual(2);
  });

  it("creates a choice prop without options", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "tone",
      type: mkWabTypeForPropKind("choice"),
      defaultValue: codeLit("anything"),
    });

    assert(result.isOk(), "expected success result");
    expect(result.value.type).toMatchObject({ name: "choice", options: [] });
    expect(tryExtractJson(result.value.defaultExpr!)).toEqual("anything");
  });

  it("creates eventHandler and queryData props", () => {
    const { tplMgr, component } = setupWithComponent();

    const handler = createComponentProp({
      component,
      tplMgr,
      name: "onClose",
      type: mkWabTypeForPropKind("eventHandler", {
        funcArgs: [{ name: "event", type: "text" }],
      }),
    });
    assert(handler.isOk(), "expected success result");
    assert(isKnownFunctionType(handler.value.type), "expected function type");
    expect(handler.value.type.params).toMatchObject([
      { argName: "event", type: { name: "text" } },
    ]);

    const queryData = createComponentProp({
      component,
      tplMgr,
      name: "products",
      type: mkWabTypeForPropKind("queryData"),
    });
    assert(queryData.isOk(), "expected success result");
    expect(queryData.value.type).toMatchObject({ name: "queryData" });
  });

  it("sets preview value, advanced, and isLocalizable", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "subtitle",
      type: mkWabTypeForPropKind("text"),
      defaultValue: codeLit("Hello"),
      previewValue: codeLit("Preview hello"),
      advanced: true,
      isLocalizable: true,
    });

    assert(result.isOk(), "expected success result");
    expect(result.value).toMatchObject({
      advanced: true,
      isLocalizable: true,
    });
    expect(tryExtractJson(result.value.previewExpr!)).toEqual("Preview hello");
  });

  it("dedupes duplicate names", () => {
    const { tplMgr, component } = setupWithComponent();

    const first = createComponentProp({
      component,
      tplMgr,
      name: "subtitle",
      type: mkWabTypeForPropKind("text"),
    });
    const second = createComponentProp({
      component,
      tplMgr,
      name: "subtitle",
      type: mkWabTypeForPropKind("text"),
    });

    assert(first.isOk(), "expected success result");
    assert(second.isOk(), "expected success result");
    expect(second.value.variable.name).toEqual("subtitle 2");
  });

  it("rejects an empty name", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "  ",
      type: mkWabTypeForPropKind("text"),
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual("Prop name cannot be empty.");
  });

  it("rejects a name ending with a slash", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "Header /",
      type: mkWabTypeForPropKind("text"),
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual('Prop name cannot end with "/".');
  });

  it("rejects duplicate options", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "tone",
      type: mkWabTypeForPropKind("choice", { options: ["a", "a"] }),
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      "Choices should not contain duplicates."
    );
  });

  it("rejects a default that does not match the type", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "count",
      type: mkWabTypeForPropKind("num"),
      defaultValue: codeLit("not a number"),
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Default value "not a number" is not valid for a "num" prop.'
    );
    expect(
      component.params.find((p) => p.variable.name === "count")
    ).toBeUndefined();
  });

  it("rejects a preview value that does not match the type", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "count",
      type: mkWabTypeForPropKind("num"),
      previewValue: codeLit(false),
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Preview value false is not valid for a "num" prop.'
    );
  });

  it("rejects a default value on an eventHandler prop", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "onClose",
      type: mkWabTypeForPropKind("eventHandler"),
      defaultValue: codeLit("noop"),
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Default values are not supported for "Function" props.'
    );
  });

  it("rejects a choice default outside the options", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "tone",
      type: mkWabTypeForPropKind("choice", {
        options: ["primary", "secondary"],
      }),
      defaultValue: codeLit("danger"),
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Default value "danger" is not among the allowed options for this "choice" prop.'
    );
  });

  it("rejects a scalar default for a multiChoice prop", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createComponentProp({
      component,
      tplMgr,
      name: "tags",
      type: mkWabTypeForPropKind("multiChoice", { options: ["a", "b"] }),
      defaultValue: codeLit("a"),
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toEqual(
      'Default value "a" is not valid for a "multiChoice" prop.'
    );
  });

  it("accepts the static shapes the studio value editors produce", () => {
    const { tplMgr, component } = setupWithComponent();

    const numericString = createComponentProp({
      component,
      tplMgr,
      name: "count",
      type: mkWabTypeForPropKind("num"),
      defaultValue: codeLit("42"),
    });
    assert(numericString.isOk(), "expected success result");

    const scalarObject = createComponentProp({
      component,
      tplMgr,
      name: "data",
      type: mkWabTypeForPropKind("any"),
      defaultValue: codeLit("hello"),
    });
    assert(scalarObject.isOk(), "expected success result");

    const dateRange = createComponentProp({
      component,
      tplMgr,
      name: "window",
      type: mkWabTypeForPropKind("dateRangeStrings"),
      defaultValue: codeLit(["2026-01-01", "2026-02-01"]),
    });
    assert(dateRange.isOk(), "expected success result");
  });

  it("creates a prop with a dynamic default value", () => {
    const { tplMgr, component } = setupWithComponent();
    const expr = customCode("$ctx.locale");

    const result = createComponentProp({
      component,
      tplMgr,
      name: "locale",
      type: mkWabTypeForPropKind("text"),
      defaultValue: expr,
    });

    assert(result.isOk(), "expected success result");
    expect(result.value.defaultExpr).toBe(expr);
  });
});
