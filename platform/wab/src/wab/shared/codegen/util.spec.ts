import { paramToVarName, toJsIdentifier } from "@/wab/shared/codegen/util";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam, ParamExportType } from "@/wab/shared/core/lang";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { Component, PlumeInfo } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

describe("toJsIdentifier", () => {
  it("should work", () => {
    expect(toJsIdentifier("hello")).toEqual("hello");
    expect(toJsIdentifier("Hello moto")).toEqual("helloMoto");
    expect(toJsIdentifier("hello-moto")).toEqual("helloMoto");
    expect(toJsIdentifier("HELLO_MOTO")).toEqual("helloMoto");
    expect(toJsIdentifier("HelloMoto")).toEqual("helloMoto");
    expect(toJsIdentifier("HELLO MOTO")).toEqual("helloMoto");
    expect(toJsIdentifier("  Hello    Moto       ")).toEqual("helloMoto");
    expect(toJsIdentifier("  Γειά σου. Κόσμε")).toEqual("γειάΣουΚόσμε");
    expect(toJsIdentifier(" مرحبا  بالعالم ")).toEqual("مرحبابالعالم");
    expect(toJsIdentifier("こ.んにち は 世界")).toEqual("こんにちは世界");
    expect(toJsIdentifier("สวัสด-ี ชาว โลก")).toEqual("สวัสดีชาวโลก");
    expect(toJsIdentifier("नमस्ते  दुनिय  ा")).toEqual("नमस्तेदुनिया");
    expect(toJsIdentifier("不對  Hello    Moto   不好    ")).toEqual(
      "不對HelloMoto不好"
    );
    expect(toJsIdentifier("&^#@$*Hello &*#@  Moto   不好    ")).toEqual(
      "helloMoto不好"
    );
    expect(toJsIdentifier("234")).toEqual("_234");
    expect(toJsIdentifier("hi234")).toEqual("hi234");
    expect(toJsIdentifier("1 2 3 4")).toEqual("_1234");
    expect(toJsIdentifier("    1 2 3 4")).toEqual("_1234");
    expect(toJsIdentifier("class")).toEqual("_class");
    expect(toJsIdentifier("true")).toEqual("_true");
    expect(toJsIdentifier("new")).toEqual("_new");
    expect(toJsIdentifier("New")).toEqual("_new");
    expect(toJsIdentifier("claSS")).toEqual("claSs");
    expect(toJsIdentifier("_hello")).toEqual("hello");
    expect(toJsIdentifier("invalidChars🌏")).toEqual("invalidChars");
  });

  it("works with camelCase: false", () => {
    expect(toJsIdentifier("Hello moto", { camelCase: false })).toEqual(
      "Hellomoto"
    );
    expect(toJsIdentifier("hello-moto", { camelCase: false })).toEqual(
      "hellomoto"
    );
    expect(toJsIdentifier("HELLO_MOTO", { camelCase: false })).toEqual(
      "HELLO_MOTO"
    );
  });

  it("works with capitalizeFirst: false", () => {
    expect(toJsIdentifier("Hello moto", { capitalizeFirst: false })).toEqual(
      "helloMoto"
    );
    expect(toJsIdentifier("hello-moto", { capitalizeFirst: false })).toEqual(
      "helloMoto"
    );
    expect(toJsIdentifier("HELLO_MOTO", { capitalizeFirst: false })).toEqual(
      "helloMoto"
    );
  });

  it("works with capitalizeFirst: true", () => {
    expect(toJsIdentifier("Hello moto", { capitalizeFirst: true })).toEqual(
      "HelloMoto"
    );
    expect(toJsIdentifier("hello-moto", { capitalizeFirst: true })).toEqual(
      "HelloMoto"
    );
    expect(toJsIdentifier("HELLO_MOTO", { capitalizeFirst: true })).toEqual(
      "HelloMoto"
    );
  });
});

describe("paramToVarName", () => {
  const childrenParam = mkParam({
    name: "children",
    type: typeFactory.renderable(),
    exportType: ParamExportType.External,
    paramType: "slot",
  });
  const onIsDisabledChangeParam = mkParam({
    name: "On is disabled change",
    type: typeFactory.func(),
    exportType: ParamExportType.External,
    paramType: "stateChangeHandler",
  });
  const ariaLabelParam = mkParam({
    name: "aria-label",
    type: typeFactory.text(),
    exportType: ParamExportType.External,
    paramType: "state",
  });
  const dataIdParam = mkParam({
    name: "data-id",
    type: typeFactory.num(),
    exportType: ParamExportType.External,
    paramType: "prop",
  });
  describe("for non-code components (includes Plume)", () => {
    it("camelCases params for plain components", () => {
      const plainComponent = mkComponent({
        name: "plain component",
        type: ComponentType.Plain,
        tplTree: mkTplTagX("div", {}),
      });
      expect(paramToVarName(plainComponent, childrenParam)).toEqual("children");
      expect(paramToVarName(plainComponent, onIsDisabledChangeParam)).toEqual(
        "onIsDisabledChange"
      );
      expect(paramToVarName(plainComponent, ariaLabelParam)).toEqual(
        "ariaLabel"
      );
      expect(paramToVarName(plainComponent, dataIdParam)).toEqual("dataId");
    });
    it("camelCases params for plume components, except aria- params", () => {
      const plumeComponent = mkComponent({
        name: "plume component",
        type: ComponentType.Plain,
        tplTree: mkTplTagX("input", {}),
        plumeInfo: new PlumeInfo({ type: "text-input" }),
      });
      expect(paramToVarName(plumeComponent, childrenParam)).toEqual("children");
      expect(paramToVarName(plumeComponent, onIsDisabledChangeParam)).toEqual(
        "onIsDisabledChange"
      );
      expect(paramToVarName(plumeComponent, ariaLabelParam)).toEqual(
        "aria-label"
      );
      expect(paramToVarName(plumeComponent, dataIdParam)).toEqual("dataId");
    });
  });
  describe("for code components", () => {
    let codeComponent: Component;
    beforeEach(() => {
      codeComponent = mkComponent({
        name: "my code component",
        type: ComponentType.Code,
        tplTree: mkTplTagX("div", {}),
      });
    });
    it("uses variable name if no propEffect", () => {
      expect(paramToVarName(codeComponent, childrenParam)).toEqual("children");
      // "On is disabled change" is a valid React prop name
      expect(paramToVarName(codeComponent, onIsDisabledChangeParam)).toEqual(
        "On is disabled change"
      );
      expect(paramToVarName(codeComponent, ariaLabelParam)).toEqual(
        "aria-label"
      );
      expect(paramToVarName(codeComponent, dataIdParam)).toEqual("data-id");
    });
    it("uses propEffect if present", () => {
      const param = mkParam({
        name: "variableName",
        type: typeFactory.bool(),
        exportType: ParamExportType.External,
        paramType: "prop",
        propEffect: "defaultVariableName",
      });
      expect(paramToVarName(codeComponent, param)).toEqual(
        "defaultVariableName"
      );
    });
    it("uses variable name for controlled prop", () => {
      const param = mkParam({
        name: "variableName",
        type: typeFactory.bool(),
        exportType: ParamExportType.External,
        paramType: "prop",
        propEffect: "defaultVariableName",
      });
      expect(
        paramToVarName(codeComponent, param, { useControlledProp: true })
      ).toEqual("variableName");
    });
  });
});
