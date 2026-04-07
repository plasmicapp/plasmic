import {
  convertExprToPageMetaString,
  convertPageMetaStringToExpr,
} from "@/wab/client/components/sidebar-tabs/PageMetaPanel";
import { codeLit, customCode } from "@/wab/shared/core/exprs";
import {
  CompositeExpr,
  CustomCode,
  ObjectPath,
  TemplatedString,
} from "@/wab/shared/model/classes";

describe("convertExprToPageMetaValue", () => {
  it("returns null for null or undefined input", () => {
    expect(convertExprToPageMetaString(null)).toBeNull();
    expect(convertExprToPageMetaString(undefined)).toBeNull();
  });

  it("returns TemplatedString for TemplatedString with dynamic parts", () => {
    const customCodeString = new TemplatedString({
      text: ["Hello ", customCode("name"), "!"],
    });
    const codeResult = convertExprToPageMetaString(customCodeString);
    expect(codeResult).toBe(customCodeString);

    const objectPath = new ObjectPath({
      path: ["user", "name"],
      fallback: null,
    });
    const objectPathString = new TemplatedString({
      text: ["Hello ", objectPath, "!"],
    });
    const pathResult = convertExprToPageMetaString(objectPathString);
    expect(pathResult).toBe(objectPathString);
  });

  it("returns string for TemplatedString without dynamic parts", () => {
    const texts = [
      ["Hello", " ", "World"],
      ["", "Hello World", ""],
      ["Hello World"],
    ];
    for (const text of texts) {
      const result = convertExprToPageMetaString(new TemplatedString({ text }));
      expect(result).toBe("Hello World");
    }
  });

  it("returns TemplatedString for ObjectPath", () => {
    const objectPath = new ObjectPath({
      path: ["user", "name"],
      fallback: null,
    });
    const result = convertExprToPageMetaString(objectPath);
    expect((result as TemplatedString).text).toEqual(["", objectPath, ""]);
  });

  it("returns TemplatedString for real CustomCode (dynamic expression)", () => {
    const customCodeExpr = customCode("user.name");
    const result = convertExprToPageMetaString(customCodeExpr);
    expect(result).toBeInstanceOf(TemplatedString);
    expect((result as TemplatedString).text).toEqual(["", customCodeExpr, ""]);
  });

  it("returns plain string for CustomCode string literal", () => {
    const literalExpr = codeLit("Hello");
    const result = convertExprToPageMetaString(literalExpr);
    expect(result).toBe("Hello");
  });

  it("returns TemplatedString for CustomCode number literal", () => {
    const literalExpr = codeLit(42);
    const result = convertExprToPageMetaString(literalExpr);
    expect(result).toBeInstanceOf(TemplatedString);
    expect((result as TemplatedString).text).toEqual(["", literalExpr, ""]);
  });

  it("returns null for other expr types", () => {
    const otherExpr = new CompositeExpr({
      hostLiteral: '{"value": "test"}',
      substitutions: {},
    });
    const result = convertExprToPageMetaString(otherExpr);
    expect(result).toBeNull();
  });
});

describe("convertPageMetaStringToExpr", () => {
  it("wraps a plain string in a CustomCode", () => {
    const result = convertPageMetaStringToExpr("hello");
    expect(result).toBeInstanceOf(CustomCode);
    expect((result as CustomCode).code).toInclude("hello");
  });

  it("passes a TemplatedString through unchanged", () => {
    const ts = new TemplatedString({ text: ["hello"] });
    expect(convertPageMetaStringToExpr(ts)).toBe(ts);
  });

  it("returns undefined for null or undefined input", () => {
    expect(convertPageMetaStringToExpr(null)).toBeUndefined();
    expect(convertPageMetaStringToExpr(undefined)).toBeUndefined();
  });
});
