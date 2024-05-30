import { CompositeExpr, TemplatedString } from "@/wab/classes";
import { getProjectFlags } from "@/wab/devflags";
import { asCode, code, customCode, ExprCtx } from "@/wab/exprs";
import { createSite } from "@/wab/sites";

describe("asCode", () => {
  const exprCtxFixture: ExprCtx = {
    component: null,
    inStudio: true,
    projectFlags: getProjectFlags(createSite()),
  };
  it("works for TemplatedString with only IIFE", () => {
    const testValue = "const test = 'evalValue';\ntest";
    const templatedString = new TemplatedString({
      text: [customCode(testValue)],
    });
    const result = asCode(templatedString, exprCtxFixture);
    expect(eval(result.code)).toEqual("evalValue");
  });

  it("works for TemplatedString with only CustomCode", () => {
    const testValue = "`${'eval'}Value`";
    const templatedString = new TemplatedString({
      text: [customCode(testValue)],
    });
    const result = asCode(templatedString, exprCtxFixture);
    expect(eval(result.code)).toEqual("evalValue");
  });

  it("works for TemplatedString with only text", () => {
    const testValue = "evalValue";
    const templatedString = new TemplatedString({
      text: [testValue],
    });
    const result = asCode(templatedString, exprCtxFixture);
    expect(eval(result.code)).toEqual("evalValue");
  });

  it("works for TemplatedString with IIFE, CustomCode and text", () => {
    const textValue = "evalValue",
      codeValue = "`${'eval'}Value`",
      iifeValue = "const test = 'evalValue';\ntest";
    const templatedString = new TemplatedString({
      text: [
        textValue,
        ", ",
        customCode(codeValue),
        ", ",
        customCode(iifeValue),
      ],
    });
    const result = asCode(templatedString, exprCtxFixture);
    console.log(result.code);
    expect(eval(result.code)).toEqual("evalValue, evalValue, evalValue");
  });

  it("works for CompositeExpr", () => {
    expect(
      eval(
        asCode(
          new CompositeExpr({
            hostLiteral: '{"fields": [{}, {"value": null}, {"value": null}]}',
            substitutions: {
              "fields.1.value": code("42"),
              "fields.2.value": code("42"),
            },
          }),
          exprCtxFixture
        ).code
      )
    ).toEqual({
      fields: [{}, { value: 42 }, { value: 42 }],
    });
  });
});
