import { getProjectFlags } from "@/wab/shared/devflags";
import { code, customCode, ExprCtx } from "@/wab/shared/core/exprs";
import { exprToDataSourceString } from "@/wab/shared/data-sources-meta/data-sources";
import { TemplatedString } from "@/wab/shared/model/classes";
import { maybeConvertToIife } from "@/wab/shared/parser-utils";
import { createSite } from "@/wab/shared/core/sites";

describe("exprToDataSourceString", () => {
  const exprCtxFixture: ExprCtx = {
    component: null,
    inStudio: true,
    projectFlags: getProjectFlags(createSite()),
  };
  it("works for TemplatedString with only IIFE", () => {
    const testValue = "const test = a;\ntest";
    const templatedString = new TemplatedString({
      text: [customCode(testValue)],
    });
    const result = exprToDataSourceString(templatedString, exprCtxFixture);
    expect(result).toEqual(`{{ (${maybeConvertToIife(testValue)}) }}`);
  });

  it("works for TemplatedString with only CustomCode", () => {
    const testValue = "$props.name";
    const templatedString = new TemplatedString({
      text: [customCode(testValue)],
    });
    const result = exprToDataSourceString(templatedString, exprCtxFixture);
    expect(result).toEqual(`{{ (${testValue}) }}`);
  });

  it("works for TemplatedString with only text", () => {
    const testValue = "test";
    const templatedString = new TemplatedString({
      text: [testValue],
    });
    const result = exprToDataSourceString(templatedString, exprCtxFixture);
    expect(result).toEqual(testValue);
  });

  it("works for TemplatedString with IIFE, CustomCode and text", () => {
    const textValue = "test",
      codeValue = "$props.name",
      iifeValue = "const test = a;\ntest";
    const templatedString = new TemplatedString({
      text: [textValue, customCode(codeValue), customCode(iifeValue)],
    });
    const result = exprToDataSourceString(templatedString, exprCtxFixture);
    expect(result).toEqual(
      `${textValue}{{ (${codeValue}) }}{{ (${maybeConvertToIife(iifeValue)}) }}`
    );
  });

  it("works for CustomCode IIFE", () => {
    const testValue = "const test = a;\ntest";
    const customCodeExpr = customCode(testValue);
    const result = exprToDataSourceString(customCodeExpr, exprCtxFixture);
    expect(result).toEqual(`{{ (${maybeConvertToIife(testValue)}) }}`);
  });

  it("works for CustomCode code", () => {
    const testValue = "$props.name";
    const customCodeExpr = customCode(testValue);
    const result = exprToDataSourceString(customCodeExpr, exprCtxFixture);
    expect(result).toEqual(`{{ (${testValue}) }}`);
  });

  it("works for CustomCode string", () => {
    const testValue = '"text"';
    const customCodeExpr = code(testValue);
    const result = exprToDataSourceString(customCodeExpr, exprCtxFixture);
    expect(result).toEqual(`{{ ${testValue} }}`);
  });
});
