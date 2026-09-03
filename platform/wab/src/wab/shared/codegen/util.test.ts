import { paramToVarName, toJsIdentifier } from "@/wab/shared/codegen/util";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ParamExportType, mkParam } from "@/wab/shared/core/lang";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { Component, PlumeInfo } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

describe("toJsIdentifier", () => {
  it("should work", () => {
    expect(toJsIdentifier("")).toEqual("_");
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
    // Regression: https://linear.app/plasmic/issue/PLA-11146
    expect(toJsIdentifier("aria-label 2")).toEqual("ariaLabel2");
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

  it("does not remove marks preceded by valid character", () => {
    // \u03__ are all marks
    testUnicode("a\u0300\u0308\u0304", {}, "a"); // camelCase removes these marks (not sure why)
    testUnicode(
      "a\u0300\u0308\u0304",
      { camelCase: false },
      "a\u0300\u0308\u0304"
    );
    // \u093E is a mark https://www.compart.com/en/unicode/U+093E
    testUnicode("\u092C\u093E\u0930\u0924", {}, "\u092C\u093E\u0930\u0924");
    testUnicode(
      "\u092C\u093E\u0930\u0924",
      { camelCase: false },
      "\u092C\u093E\u0930\u0924"
    );
  });

  it("removes marks preceded by invalid character \uD83D\uDE00", () => {
    // \uD83D is emoji, \u03__ are all marks
    testUnicode("a\uD83D\uDE00\u0300\u0308\u0304", {}, "a");
    testUnicode("a\uD83D\uDE00\u0300\u0308\u0304", { camelCase: false }, "a");
  });

  it("removes \\u200C (zero-width non-joiner)", () => {
    testUnicode("\u0644\u200C\u0627", {}, "\u0644\u0627"); // camelCase removes \u200C
    testUnicode("\u0644\u200C\u0627", { camelCase: false }, "\u0644\u0627");
  });

  it("removes \\u200D (zero-width non-joiner)", () => {
    testUnicode("\u0915\u094D\u200D\u0937", {}, "\u0915\u094D\u0937"); // camelCase removes \u200D
    testUnicode(
      "\u0915\u094D\u200D\u0937",
      { camelCase: false },
      "\u0915\u094D\u0937"
    );
  });

  it("removes \\u200D (zero-width joiner) and \\uFE0F (variation selector)", () => {
    testUnicode("emoji\uD83D\uDE4B\u200D\u2642\uFE0F", {}, "emoji");
    testUnicode(
      "emoji\uD83D\uDE4B\u200D\u2642\uFE0F",
      { camelCase: false },
      "emoji"
    );
  });

  function testUnicode(
    input: string,
    opts: Parameters<typeof toJsIdentifier>[1],
    expected: string
  ) {
    const result = toJsIdentifier(input, opts);
    expect(escapeUnicode(result)).toEqual(escapeUnicode(expected));
    expect(result).toEqual(expected);
  }

  // For debugging unicode with invisible characters
  function escapeUnicode(str: string) {
    return [...str]
      .map((c: string) =>
        // eslint-disable-next-line no-control-regex
        /^[\x00-\x7F]$/.test(c)
          ? c
          : c
              .split("")
              .map((a) => "\\u" + a.charCodeAt(0).toString(16).padStart(4, "0"))
              .join("")
      )
      .join("");
  }
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
