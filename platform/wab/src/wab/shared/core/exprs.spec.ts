import {
  ExprCtx,
  asCode,
  code,
  codeLit,
  customCode,
  getCodeExpressionWithFallback,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import { getProjectFlags } from "@/wab/shared/devflags";
import { CompositeExpr, TemplatedString } from "@/wab/shared/model/classes";

describe("asCode", () => {
  const exprCtxFixture: ExprCtx = {
    component: null,
    inStudio: true,
    projectFlags: getProjectFlags(createSite()),
  };

  it("works for TemplatedString with only CustomCode fallback", () => {
    const wrongExpr = '"test".not.possible';
    const testValue = "`${'eval'}Value`";
    const templatedString = new TemplatedString({
      text: [customCode(wrongExpr, customCode(testValue))],
    });
    const result = getCodeExpressionWithFallback(
      asCode(templatedString, exprCtxFixture),
      exprCtxFixture
    );
    expect(eval(result)).toEqual("evalValue");
  });

  it("works for TemplatedString with only IIFE", () => {
    const testValue = "const test = 'evalValue';\ntest";
    const templatedString = new TemplatedString({
      text: [customCode(testValue)],
    });
    const result = getCodeExpressionWithFallback(
      asCode(templatedString, exprCtxFixture),
      exprCtxFixture
    );
    expect(eval(result)).toEqual("evalValue");
  });

  it("works for TemplatedString with only CustomCode", () => {
    const testValue = "`${'eval'}Value`";
    const templatedString = new TemplatedString({
      text: [customCode(testValue)],
    });
    const result = getCodeExpressionWithFallback(
      asCode(templatedString, exprCtxFixture),
      exprCtxFixture
    );
    expect(eval(result)).toEqual("evalValue");
  });

  it("works for TemplatedString with only text", () => {
    const testValue = "evalValue";
    const templatedString = new TemplatedString({
      text: [testValue],
    });
    const result = getCodeExpressionWithFallback(
      asCode(templatedString, exprCtxFixture),
      exprCtxFixture
    );
    expect(eval(result)).toEqual("evalValue");
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
    const result = getCodeExpressionWithFallback(
      asCode(templatedString, exprCtxFixture),
      exprCtxFixture
    );
    expect(eval(result)).toEqual("evalValue, evalValue, evalValue");
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

describe("tryExtractJson", () => {
  it("extracts simple object from CompositeExpr with static values", () => {
    const compositeExpr = new CompositeExpr({
      hostLiteral: '{"darkMode": null, "fontSize": null}',
      substitutions: {
        darkMode: codeLit(false),
        fontSize: codeLit(13),
      },
    });

    const result = tryExtractJson(compositeExpr);
    expect(result).toEqual({ darkMode: false, fontSize: 13 });
  });

  it("extracts nested object from CompositeExpr with static values", () => {
    const compositeExpr = new CompositeExpr({
      hostLiteral: '{"config": null}',
      substitutions: {
        config: new CompositeExpr({
          hostLiteral: '{"theme": null, "size": null}',
          substitutions: {
            theme: codeLit("dark"),
            size: codeLit(16),
          },
        }),
      },
    });

    const result = tryExtractJson(compositeExpr);
    expect(result).toEqual({ config: { theme: "dark", size: 16 } });
  });

  it("returns undefined for CompositeExpr with dynamic values", () => {
    const compositeExpr = new CompositeExpr({
      hostLiteral: '{"value": null}',
      substitutions: {
        value: customCode("someVariable"),
      },
    });

    const result = tryExtractJson(compositeExpr);
    expect(result).toBeUndefined();
  });

  it("returns undefined for CompositeExpr with mixed static and dynamic values", () => {
    const compositeExpr = new CompositeExpr({
      hostLiteral: '{"static": null, "dynamic": null}',
      substitutions: {
        static: codeLit(42),
        dynamic: customCode("someVariable"),
      },
    });

    const result = tryExtractJson(compositeExpr);
    expect(result).toBeUndefined();
  });
});
