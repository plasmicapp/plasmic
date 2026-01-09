import {
  ExprCtx,
  asCode,
  code,
  codeLit,
  convertExprToStringOrTemplatedString,
  customCode,
  deserCompositeExpr,
  deserCompositeExprMaybe,
  getCodeExpressionWithFallback,
  serCompositeExprMaybe,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import { getProjectFlags } from "@/wab/shared/devflags";
import {
  CompositeExpr,
  CustomCode,
  ObjectPath,
  TemplatedString,
} from "@/wab/shared/model/classes";

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
    const currentCode = asCode(
      new CompositeExpr({
        hostLiteral: '{"fields": [{}, {"value": null}, {"value": null}]}',
        substitutions: {
          '["fields"][1]["value"]': code("42"),
          '["fields"][2]["value"]': code("42"),
        },
      }),
      exprCtxFixture
    ).code;
    const currentEval = eval(currentCode);
    expect(currentEval).toEqual({
      fields: [{}, { value: 42 }, { value: 42 }],
    });

    const legacyCode = asCode(
      new CompositeExpr({
        hostLiteral: '{"fields": [{}, {"value": null}, {"value": null}]}',
        substitutions: {
          "fields.1.value": code("42"),
          "fields.2.value": code("42"),
        },
      }),
      exprCtxFixture
    ).code;
    const legacyEval = eval(legacyCode);
    expect(legacyCode).toEqual(currentCode);
    expect(legacyEval).toEqual(currentEval);
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

describe("serCompositeExprMaybe/deserCompositeExprMaybe/deserCompositeExpr", () => {
  it("serializes literal values to CustomCode", () => {
    [
      undefined,
      null,
      false,
      true,
      42,
      "hello",
      [],
      [1, 2, 3, "four", null],
      {},
      { foo: "bar", baz: 123, qux: undefined },
      { and: [{ "==": [{ var: "name" }, "John"] }] },
      {
        and: [
          { "==": [{ var: "name" }, "John"] },
          { ">=": [{ var: "age" }, 30] },
        ],
      },
    ].forEach((x) => {
      const serialized = serCompositeExprMaybe(x);
      expect(serialized).toBeInstanceOf(CustomCode);
      expect(tryExtractJson(serialized)).toEqual(x);
    });
  });

  it("serializes and deserializes values with expressions to CompositeExpr", () => {
    [
      [1, code("1+1"), 3, null],
      { name: "John", age: codeLit(42), status: undefined },
      { and: [{ "==": [{ var: "bar" }, code("$dynamicValue")] }] },
      {
        and: [
          {
            "==": [
              { var: "id" },
              new ObjectPath({ path: ["user", "id"], fallback: undefined }),
            ],
          },
        ],
      },
      { foo: { bar: codeLit(123) }, "foo.bar": codeLit(456) },
    ].forEach((x) => {
      const serialized = serCompositeExprMaybe(x);
      expect(serialized).toBeInstanceOf(CompositeExpr);
      expect(deserCompositeExpr(serialized as CompositeExpr)).toEqual(x);
      expect(deserCompositeExprMaybe(serialized)).toEqual(x);
    });
  });

  describe("serCompositeExprMaybe", () => {
    it("passes through Expr values", () => {
      const value = code("1+1");
      expect(serCompositeExprMaybe(value)).toBe(value);
    });
  });

  describe("deserCompositeExprMaybe", () => {
    it("passes through non-CompositeExpr values", () => {
      const simpleValue = { foo: "bar" };
      expect(deserCompositeExprMaybe(simpleValue)).toBe(simpleValue);

      const customCodeValue = code("42");
      expect(deserCompositeExprMaybe(customCodeValue)).toBe(customCodeValue);
    });
  });

  describe("implementation", () => {
    it("current serialization format", () => {
      const code1 = codeLit(1);
      const code2 = codeLit(2);
      const code3 = codeLit(3);
      const value = [
        {
          foo: { bar: code1 },
          "foo.bar": code2,
        },
        { ".'\"`": code3 },
      ];
      const composite = serCompositeExprMaybe(value);
      expect(composite).toMatchObject({
        hostLiteral: '[{"foo":{"bar":null},"foo.bar":null},{".\'\\"`":null}]',
        substitutions: {
          '[0]["foo"]["bar"]': code1,
          '[0]["foo.bar"]': code2,
          '[1][".\'\\"`"]': code3,
        },
      });
      expect(deserCompositeExpr(composite as CompositeExpr)).toEqual(value);
    });

    // The substitutions keys used to be in the format `key1.key2`,
    // but this does not work when string indexes have dots in them.
    // We still need to support this for old CompositeExpr serializations.
    it("legacy serialization format", () => {
      const code1 = codeLit(1);
      const code2 = codeLit(2);
      const composite = new CompositeExpr({
        hostLiteral: '[{"foo":{"bar":null},"foo.bar":null},{".\'\\"`":null}]',
        substitutions: {
          "0.foo.bar": code1,
          "1..'\"`": code2,
        },
      });
      expect(deserCompositeExpr(composite)).toEqual([
        {
          foo: { bar: code1 }, // ambiguous
          "foo.bar": null, // ambiguous
        },
        {
          ".'\"`": null, // not expressible
          "": {
            "'\"`": code2, // creates new key instead
          },
        },
      ]);
    });
  });
});

describe("convertExprToStringOrTemplatedString", () => {
  it("returns null for null or undefined input", () => {
    expect(convertExprToStringOrTemplatedString(null)).toBeNull();
    expect(convertExprToStringOrTemplatedString(undefined)).toBeNull();
  });

  it("returns TemplatedString for TemplatedString with dynamic parts", () => {
    const customCodeString = new TemplatedString({
      text: ["Hello ", customCode("name"), "!"],
    });
    const codeResult = convertExprToStringOrTemplatedString(customCodeString);
    expect(codeResult).toBe(customCodeString);

    const objectPath = new ObjectPath({
      path: ["user", "name"],
      fallback: null,
    });
    const objectPathString = new TemplatedString({
      text: ["Hello ", objectPath, "!"],
    });
    const pathResult = convertExprToStringOrTemplatedString(objectPathString);
    expect(pathResult).toBe(objectPathString);
  });

  it("returns string for TemplatedString without dynamic parts", () => {
    const texts = [
      ["Hello", " ", "World"],
      ["", "Hello World", ""],
      ["Hello World"],
    ];
    for (const text of texts) {
      const result = convertExprToStringOrTemplatedString(
        new TemplatedString({ text })
      );
      expect(result).toBe("Hello World");
    }
  });

  it("returns TemplatedString for ObjectPath", () => {
    const objectPath = new ObjectPath({
      path: ["user", "name"],
      fallback: null,
    });
    const result = convertExprToStringOrTemplatedString(objectPath);
    expect((result as TemplatedString).text).toEqual(["", objectPath, ""]);
  });

  it("returns TemplatedString for CustomCode", () => {
    const customCodeExpr = customCode("user.name");
    const result = convertExprToStringOrTemplatedString(customCodeExpr);
    expect(result).toBeInstanceOf(TemplatedString);
    expect((result as TemplatedString).text).toEqual(["", customCodeExpr, ""]);
  });

  it("returns null for other expr types", () => {
    const otherExpr = new CompositeExpr({
      hostLiteral: '{"value": "test"}',
      substitutions: {},
    });
    const result = convertExprToStringOrTemplatedString(otherExpr);
    expect(result).toBeNull();
  });
});
