import {
  codeToDynExpr,
  exprToInterpolatedString,
  interpolatedStringToCodeExpr,
  interpolatedStringToExpr,
  interpolatedStringToRichText,
  interpolatedStringToTemplatedString,
  objectLiteralToExpr,
  parseInterpolatedString,
} from "@/wab/shared/copilot/dynamic-value-input";
import { codeLit, customCode, tryExtractJson } from "@/wab/shared/core/exprs";
import { EvaluationError } from "@/wab/shared/eval/expression-parser";
import {
  CustomCode,
  EventHandler,
  Expr,
  ObjectPath,
  TemplatedString,
  ensureKnownCompositeExpr,
  ensureKnownExprText,
  ensureKnownRawText,
  isKnownCompositeExpr,
  isKnownExprText,
  isKnownRawText,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";

describe("parseInterpolatedString", () => {
  it("keeps plain text a string", () => {
    expect(parseInterpolatedString("My nice title")).toEqual("My nice title");
  });

  it("preserves leading/trailing whitespace in plain text", () => {
    expect(parseInterpolatedString(" Hello ")).toEqual(" Hello ");
  });

  it("throws an EvaluationError on a malformed {{ }} body", () => {
    expect(() => parseInterpolatedString("{{ ?? }}")).toThrow(EvaluationError);
  });
});

describe("codeToDynExpr", () => {
  it("returns an ObjectPath for a pure member-access chain", () => {
    const expr = codeToDynExpr("$ctx.foo.bar");
    expect(expr).toBeInstanceOf(ObjectPath);
    expect((expr as ObjectPath).path).toEqual(["$ctx", "foo", "bar"]);
  });

  it("returns a CustomCode for an operator expression", () => {
    const expr = codeToDynExpr('$ctx.foo ?? "x"');
    expect(expr).toBeInstanceOf(CustomCode);
    expect((expr as CustomCode).code).toEqual('($ctx.foo ?? "x")');
  });
});

describe("interpolatedStringToTemplatedString", () => {
  it("classifies {{ $ctx.foo }} as ObjectPath", () => {
    const ts = interpolatedStringToTemplatedString("Hello {{ $ctx.foo }}!");
    expect(ts.text[0]).toEqual("Hello ");
    expect(ts.text[1]).toBeInstanceOf(ObjectPath);
    expect((ts.text[1] as ObjectPath).path).toEqual(["$ctx", "foo"]);
    expect(ts.text[2]).toEqual("!");
  });

  it("classifies complex JS as CustomCode", () => {
    const ts = interpolatedStringToTemplatedString(
      "prefix {{ $ctx.first + ' ' + $ctx.second }}"
    );
    expect(ts.text[0]).toEqual("prefix ");
    expect(ts.text[1]).toBeInstanceOf(CustomCode);
  });

  it("preserves whitespace around dynamic parts", () => {
    const ts = interpolatedStringToTemplatedString(" Hi {{ $ctx.name }} ");
    expect(ts.text[0]).toEqual(" Hi ");
    expect(ts.text[1]).toBeInstanceOf(ObjectPath);
    expect(ts.text[2]).toEqual(" ");
    expect(exprToInterpolatedString(ts)).toEqual(" Hi {{ $ctx.name }} ");
  });
});

describe("interpolatedStringToExpr", () => {
  it("keeps plain markup static (codeLit)", () => {
    const expr = interpolatedStringToExpr("/checkout");
    expect((expr as CustomCode).code).toEqual('"/checkout"');
  });

  it("collapses a single {{ }} path to an ObjectPath", () => {
    const expr = interpolatedStringToExpr("{{ currentItem.sprite }}");
    expect(expr).toBeInstanceOf(ObjectPath);
    expect((expr as ObjectPath).path).toEqual(["currentItem", "sprite"]);
  });

  it("produces a TemplatedString when static and dynamic parts mix", () => {
    const expr = interpolatedStringToExpr("/pokemon/{{ currentItem.id }}");
    expect(isKnownTemplatedString(expr)).toBe(true);
    const ts = expr as TemplatedString;
    expect(ts.text[0]).toEqual("/pokemon/");
    expect(ts.text[1]).toBeInstanceOf(ObjectPath);
  });
});

describe("objectLiteralToExpr", () => {
  it("stores a fully-static object as codeLit JSON", () => {
    const expr = objectLiteralToExpr(
      '{ "url": "https://x", "method": "GET" }'
    )!;
    expect(isKnownCompositeExpr(expr)).toBe(false);
    expect(expr).toBeInstanceOf(CustomCode);
    expect(tryExtractJson(expr)).toEqual({ url: "https://x", method: "GET" });
  });

  it("hoists a {{ }} leaf into a CompositeExpr substitution", () => {
    const composite = ensureKnownCompositeExpr(
      objectLiteralToExpr(
        '{ "url": "{{ $ctx.params.api }}", "method": "GET" }'
      )!
    );
    expect(JSON.parse(composite.hostLiteral)).toEqual({
      url: null,
      method: "GET",
    });
    expect(Object.keys(composite.substitutions)).toEqual(['["url"]']);
    const sub = composite.substitutions['["url"]'];
    expect(sub).toBeInstanceOf(ObjectPath);
    expect((sub as ObjectPath).path).toEqual(["$ctx", "params", "api"]);
  });

  it("hoists a nested dynamic leaf at its bracket path", () => {
    const composite = ensureKnownCompositeExpr(
      objectLiteralToExpr(
        '{ "headers": { "Authorization": "{{ $ctx.token }}" } }'
      )!
    );
    expect(JSON.parse(composite.hostLiteral)).toEqual({
      headers: { Authorization: null },
    });
    expect(Object.keys(composite.substitutions)).toEqual([
      '["headers"]["Authorization"]',
    ]);
  });

  it("wraps a {{ }} non-string literal leaf as a CustomCode substitution", () => {
    const composite = ensureKnownCompositeExpr(
      objectLiteralToExpr('{ "limit": "{{ 5 }}" }')!
    );
    expect(JSON.parse(composite.hostLiteral)).toEqual({ limit: null });
    const sub = composite.substitutions['["limit"]'];
    expect(sub).toBeInstanceOf(CustomCode);
    expect((sub as CustomCode).code).toEqual("(5)");
  });

  it("handles a fully-static array as codeLit JSON", () => {
    const expr = objectLiteralToExpr("[1, 2, 3]")!;
    expect(isKnownCompositeExpr(expr)).toBe(false);
    expect(tryExtractJson(expr)).toEqual([1, 2, 3]);
  });

  it("accepts a parens-wrapped literal", () => {
    expect(tryExtractJson(objectLiteralToExpr('({ "a": 1 })')!)).toEqual({
      a: 1,
    });
  });

  it("throws for a bare-JS leaf (must wrap in {{ }})", () => {
    expect(() => objectLiteralToExpr('{ "url": $ctx.params.api }')).toThrow(
      EvaluationError
    );
  });

  it("throws for a spread in the object", () => {
    expect(() =>
      objectLiteralToExpr('{ ...$ctx.base, "method": "GET" }')
    ).toThrow(EvaluationError);
  });

  it("throws for non-JSON (unquoted keys)", () => {
    expect(() => objectLiteralToExpr('{ url: "https://x" }')).toThrow(
      EvaluationError
    );
  });

  it("returns undefined for a scalar (falls back to interpolation)", () => {
    expect(objectLiteralToExpr("active")).toBeUndefined();
    expect(objectLiteralToExpr("{{ $ctx.params.api }}")).toBeUndefined();
  });
});

describe("interpolatedStringToCodeExpr", () => {
  it("returns an ObjectPath for a {{ }} path", () => {
    const expr = interpolatedStringToCodeExpr("{{ $q.pokedex.data }}");
    expect(expr).toBeInstanceOf(ObjectPath);
    expect((expr as ObjectPath).path).toEqual(["$q", "pokedex", "data"]);
  });

  it("throws for a bare expression without the {{ }} wrapper", () => {
    expect(() => interpolatedStringToCodeExpr("$q.pokedex.data")).toThrow(
      EvaluationError
    );
  });

  it("returns a CustomCode for a comparison expression", () => {
    const expr = interpolatedStringToCodeExpr("{{ $q.users.data.length > 0 }}");
    expect(expr).toBeInstanceOf(CustomCode);
    expect((expr as CustomCode).code).toContain("$q.users.data.length > 0");
  });

  it("throws for a quoted static string", () => {
    expect(() => interpolatedStringToCodeExpr('"notAnArray"')).toThrow(
      EvaluationError
    );
  });

  it("throws for a bare single-word identifier (footgun guard)", () => {
    expect(() => interpolatedStringToCodeExpr("pokemonList")).toThrow(
      EvaluationError
    );
  });

  it("throws for a mixed templated string (static + dynamic)", () => {
    expect(() =>
      interpolatedStringToCodeExpr("items: {{ $q.x.data }}")
    ).toThrow(EvaluationError);
  });

  it("throws for malformed input", () => {
    expect(() => interpolatedStringToCodeExpr("{{ ?? }}")).toThrow(
      EvaluationError
    );
  });
});

describe("interpolatedStringToRichText", () => {
  it("returns RawText for plain text", () => {
    const rich = interpolatedStringToRichText("Hello world");
    expect(isKnownRawText(rich)).toBe(true);
    expect(ensureKnownRawText(rich).text).toEqual("Hello world");
  });

  it("preserves leading/trailing whitespace in plain text", () => {
    const rich = interpolatedStringToRichText(" Hello ");
    expect(ensureKnownRawText(rich).text).toEqual(" Hello ");
  });

  it("returns ExprText for an interpolated string", () => {
    const rich = interpolatedStringToRichText("Posts in {{ $ctx.category }}");
    expect(isKnownExprText(rich)).toBe(true);
    expect(ensureKnownExprText(rich).html).toBe(false);
    expect(ensureKnownExprText(rich).expr).toBeInstanceOf(TemplatedString);
  });

  it("collapses a pure {{ }} interpolation to an ExprText with ObjectPath", () => {
    const rich = interpolatedStringToRichText("{{ $props.title }}");
    expect(isKnownExprText(rich)).toBe(true);
    expect(ensureKnownExprText(rich).expr).toBeInstanceOf(ObjectPath);
  });
});

describe("exprToInterpolatedString", () => {
  it("renders a static codeLit string as raw text", () => {
    expect(exprToInterpolatedString(codeLit("Hello"))).toEqual("Hello");
  });

  it("renders an ObjectPath as a {{ }} interpolation", () => {
    const expr = codeToDynExpr("currentItem.sprite");
    expect(exprToInterpolatedString(expr)).toEqual("{{ currentItem.sprite }}");
  });

  it("renders an ObjectPath with numeric index", () => {
    const expr = codeToDynExpr("$q.pokedex.data[0].name");
    expect(exprToInterpolatedString(expr)).toEqual(
      "{{ $q.pokedex.data[0].name }}"
    );
  });

  it("renders a real CustomCode with parens stripped", () => {
    const expr = customCode('$props.title ?? "Guest"');
    expect(exprToInterpolatedString(expr)).toEqual(
      '{{ $props.title ?? "Guest" }}'
    );
  });

  it("renders a TemplatedString with mixed static and dynamic parts", () => {
    const expr = interpolatedStringToTemplatedString("Hi {{ $ctx.name }}!");
    expect(exprToInterpolatedString(expr)).toEqual("Hi {{ $ctx.name }}!");
  });

  it("omits an ObjectPath fallback", () => {
    const expr = new ObjectPath({
      path: ["$props", "title"],
      fallback: codeLit("Untitled"),
    });
    expect(exprToInterpolatedString(expr)).toEqual("{{ $props.title }}");
  });

  it("returns undefined for expr kinds with no inline form", () => {
    expect(
      exprToInterpolatedString(new EventHandler({ interactions: [] }))
    ).toBeUndefined();
  });
});

describe("dynamic-value round trip (insertHtml <-> read)", () => {
  function exprEqual(a: Expr, b: Expr) {
    // Compare by serialized interpolated form, which is the round-trip contract.
    expect(exprToInterpolatedString(a)).toEqual(exprToInterpolatedString(b));
  }

  const cases: { name: string; expr: Expr }[] = [
    {
      name: "ObjectPath",
      expr: codeToDynExpr("currentItem.id"),
    },
    {
      name: "CustomCode",
      expr: customCode("$q.users.data.length > 0"),
    },
    {
      name: "TemplatedString",
      expr: interpolatedStringToTemplatedString("/p/{{ currentItem.slug }}/x"),
    },
  ];

  for (const { name, expr } of cases) {
    it(`round-trips a ${name} through exprToInterpolatedString -> interpolatedStringToExpr`, () => {
      const serialized = exprToInterpolatedString(expr)!;
      const reparsed = interpolatedStringToExpr(serialized);
      exprEqual(reparsed, expr);
    });
  }

  it("round-trips a static string", () => {
    const serialized = exprToInterpolatedString(codeLit("/home"))!;
    expect(serialized).toEqual("/home");
    expect((interpolatedStringToExpr(serialized) as CustomCode).code).toEqual(
      codeLit("/home").code
    );
  });
});
