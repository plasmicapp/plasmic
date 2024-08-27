import { paramToVarName, toJsIdentifier } from "@/wab/shared/codegen/util";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam, ParamExportType } from "@/wab/shared/core/lang";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { Component } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { mkScreenVariantGroup } from "@/wab/shared/SpecialVariants";

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
    expect(() => {
      toJsIdentifier("Hello moto", { camelCase: false });
    }).toThrow(); // BUG
    expect(toJsIdentifier("hello-moto", { camelCase: false })).toEqual(
      "hello-moto"
    ); // BUG
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
  describe("for non-code components (includes Plume)", () => {
    let component: Component;
    beforeEach(() => {
      component = mkComponent({
        name: "my component",
        type: ComponentType.Plain,
        tplTree: mkTplTagX("div", {}),
      });
    });
    it("works for GlobalVariantGroupParam", () => {
      const screenVariantGroup = mkScreenVariantGroup();
      expect(paramToVarName(component, screenVariantGroup.param)).toEqual(
        "screen"
      );
    });
    it("works for SlotParam", () => {
      const param = mkParam({
        name: "My slot",
        type: typeFactory.renderable(),
        exportType: ParamExportType.External,
        paramType: "slot",
      });
      expect(paramToVarName(component, param)).toEqual("mySlot");
    });
    it("works for StateParam", () => {
      const param = mkParam({
        name: "Is selected",
        type: typeFactory.bool(),
        exportType: ParamExportType.External,
        paramType: "state",
      });
      expect(paramToVarName(component, param)).toEqual("isSelected");
    });
    it("works and preserves aria- names for PropParam ", () => {
      const ariaLabelParam = mkParam({
        name: "aria-label",
        type: typeFactory.text(),
        exportType: ParamExportType.External,
        paramType: "prop",
      });
      const ariaLabelledByParam = mkParam({
        name: "aria-labelledby",
        type: typeFactory.text(),
        exportType: ParamExportType.External,
        paramType: "prop",
      });
      expect(paramToVarName(component, ariaLabelParam)).toEqual("aria-label");
      expect(paramToVarName(component, ariaLabelledByParam)).toEqual(
        "aria-labelledby"
      );
    });
    it("works and preserves data- names for PropParam", () => {
      const param = mkParam({
        name: "data-focus-visible",
        type: typeFactory.bool(),
        exportType: ParamExportType.External,
        paramType: "prop",
      });
      expect(paramToVarName(component, param)).toEqual("data-focus-visible");
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
    it("uses variable name for if no propEffect", () => {
      const param = mkParam({
        name: "variableName",
        type: typeFactory.bool(),
        exportType: ParamExportType.External,
        paramType: "prop",
      });
      expect(paramToVarName(codeComponent, param)).toEqual("variableName");
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
