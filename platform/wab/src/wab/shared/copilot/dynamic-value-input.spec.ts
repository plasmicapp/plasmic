import {
  buildDynamicExprFromJsSnippet,
  interpolatedStringToTemplatedString,
  parseDynamicStringInput,
} from "@/wab/shared/copilot/dynamic-value-input";
import { asCode } from "@/wab/shared/core/exprs";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { EvaluationError } from "@/wab/shared/eval/expression-parser";
import {
  CustomCode,
  ObjectPath,
  TemplatedString,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";

const exprCtx = {
  component: null,
  projectFlags: DEVFLAGS,
  inStudio: true,
};

describe("parseDynamicStringInput", () => {
  describe("quoted static-string mode", () => {
    it("unwraps a double-quoted static string", () => {
      expect(parseDynamicStringInput('"Hello, world!"')).toEqual(
        "Hello, world!"
      );
    });

    it("unwraps a single-quoted static string", () => {
      expect(parseDynamicStringInput("'Hello, world!'")).toEqual(
        "Hello, world!"
      );
    });

    it("returns an empty string for empty quotes", () => {
      expect(parseDynamicStringInput('""')).toEqual("");
    });

    it("interprets JS escape sequences in quoted strings", () => {
      expect(parseDynamicStringInput('"Hello\\nWorld"')).toEqual(
        "Hello\nWorld"
      );
      expect(parseDynamicStringInput('"a \\"quoted\\" word"')).toEqual(
        'a "quoted" word'
      );
    });

    it("does not parse plain unquoted text", () => {
      expect(() => parseDynamicStringInput("Hello, world!")).toThrow(
        EvaluationError
      );
    });
  });

  describe("backtick-wrapped templated string mode", () => {
    it("returns the inner content for a pure static template", () => {
      expect(parseDynamicStringInput("`Hello, world!`")).toEqual(
        "Hello, world!"
      );
    });

    it("returns an empty string for empty backticks", () => {
      expect(parseDynamicStringInput("``")).toEqual("");
    });

    it("simplifies a single-interpolation template to a raw ObjectPath", () => {
      // `${$ctx.foo}` has no surrounding static text, so it collapses to the
      // bare ObjectPath rather than a TemplatedString of one part.
      const result = parseDynamicStringInput("`${$ctx.foo}`");
      expect(result).toBeInstanceOf(ObjectPath);
      expect((result as ObjectPath).path).toEqual(["$ctx", "foo"]);
    });

    it("treats bracket access with string literal as ObjectPath", () => {
      const result = parseDynamicStringInput('`${$ctx["foo"]}`');
      expect(result).toBeInstanceOf(ObjectPath);
      expect((result as ObjectPath).path).toEqual(["$ctx", "foo"]);
    });

    it("preserves numeric indices in ObjectPath.path", () => {
      const result = parseDynamicStringInput("`${$ctx.items[0].name}`");
      expect(result).toBeInstanceOf(ObjectPath);
      expect((result as ObjectPath).path).toEqual(["$ctx", "items", 0, "name"]);
    });

    it("classifies free-variable chains as ObjectPath", () => {
      const result = parseDynamicStringInput("`${currentItem.title}`");
      expect(result).toBeInstanceOf(ObjectPath);
      expect((result as ObjectPath).path).toEqual(["currentItem", "title"]);
    });

    it("emits string segments around interpolations", () => {
      const result = parseDynamicStringInput("`Hello ${$ctx.name}!`");
      expect(isKnownTemplatedString(result)).toBe(true);
      const ts = result as TemplatedString;
      expect(ts.text.length).toEqual(3);
      expect(ts.text[0]).toEqual("Hello ");
      expect(ts.text[1]).toBeInstanceOf(ObjectPath);
      expect(ts.text[2]).toEqual("!");
    });

    it("classifies single-interpolation operator expression as CustomCode", () => {
      const result = parseDynamicStringInput('`${$ctx.foo ?? "x"}`');
      expect(result).toBeInstanceOf(CustomCode);
      expect((result as CustomCode).code).toContain("$ctx.foo");
    });

    it("classifies concatenation as CustomCode", () => {
      const result = parseDynamicStringInput(
        '`${$ctx.foo + " " + $queries.bar.name}`'
      );
      expect(result).toBeInstanceOf(CustomCode);
    });

    it("classifies dynamic accessors as CustomCode", () => {
      const result = parseDynamicStringInput("`${$ctx.items[idx]}`");
      expect(result).toBeInstanceOf(CustomCode);
    });

    it("supports multiple interpolations", () => {
      const result = parseDynamicStringInput(
        "`${$ctx.first} and ${$ctx.second}`"
      );
      expect(isKnownTemplatedString(result)).toBe(true);
      const ts = result as TemplatedString;
      expect(ts.text.length).toEqual(5);
      expect(ts.text[0]).toEqual("");
      expect(ts.text[1]).toBeInstanceOf(ObjectPath);
      expect(ts.text[2]).toEqual(" and ");
      expect(ts.text[3]).toBeInstanceOf(ObjectPath);
      expect(ts.text[4]).toEqual("");
    });

    it("treats \\${...} inside backticks as a literal string", () => {
      const result = parseDynamicStringInput("`\\${$ctx.foo}`");
      expect(result).toEqual("${$ctx.foo}");
    });

    it("throws an EvaluationError on malformed interpolation", () => {
      expect(() => parseDynamicStringInput("`${$ctx.}`")).toThrow(
        EvaluationError
      );
    });

    it("throws on unterminated ${ inside backticks", () => {
      expect(() => parseDynamicStringInput("`Hello ${$ctx.foo`")).toThrow(
        EvaluationError
      );
    });

    it("throws on empty interpolation", () => {
      expect(() => parseDynamicStringInput("`Hello ${}`")).toThrow(
        EvaluationError
      );
    });

    it("round-trips via asCode for a templated string", () => {
      const result = parseDynamicStringInput("`a ${$ctx.foo} b`");
      expect(isKnownTemplatedString(result)).toBe(true);
      const code = asCode(result as TemplatedString, exprCtx).code;
      expect(code).toMatch(/^`/);
      expect(code).toMatch(/`$/);
      expect(code).toContain("$ctx.foo");
      expect(code).toContain("a ");
      expect(code).toContain(" b");
    });
  });

  describe("bare JS expression mode", () => {
    it("returns a raw CustomCode for a complex expression", () => {
      const result = parseDynamicStringInput(
        "$props.description ?? 'Product details'"
      );
      expect(result).toBeInstanceOf(CustomCode);
      expect((result as CustomCode).code).toEqual(
        "($props.description ?? 'Product details')"
      );
    });

    it("returns a raw ObjectPath for a pure member-access chain", () => {
      const result = parseDynamicStringInput("$ctx.foo");
      expect(result).toBeInstanceOf(ObjectPath);
      expect((result as ObjectPath).path).toEqual(["$ctx", "foo"]);
    });

    it("produces the same shape for `${$ctx.foo}` and $ctx.foo", () => {
      const wrapped = parseDynamicStringInput("`${$ctx.foo}`");
      const bare = parseDynamicStringInput("$ctx.foo");
      expect(wrapped).toBeInstanceOf(ObjectPath);
      expect(bare).toBeInstanceOf(ObjectPath);
      expect((wrapped as ObjectPath).path).toEqual((bare as ObjectPath).path);
    });
  });

  describe("invalid input", () => {
    it("throws on plain unquoted prose", () => {
      expect(() => parseDynamicStringInput("Hello, world!")).toThrow(
        EvaluationError
      );
    });

    it("error message echoes input and mentions quoting", () => {
      try {
        parseDynamicStringInput("Hello, world!");
        fail("expected throw");
      } catch (e) {
        expect(e).toBeInstanceOf(EvaluationError);
        const msg = (e as Error).message;
        expect(msg).toContain("Hello, world!");
        expect(msg).toMatch(/quote/i);
      }
    });

    it("throws on empty bare input", () => {
      expect(() => parseDynamicStringInput("")).toThrow(EvaluationError);
    });

    it("throws on unwrapped templated syntax (no backticks)", () => {
      // ${...} is only legal inside a backtick-wrapped string. Without
      // backticks the input is parsed as a JS expression and `${` is a syntax
      // error.
      expect(() => parseDynamicStringInput("${$ctx.foo}")).toThrow(
        EvaluationError
      );
    });
  });
});

describe("buildDynamicExprFromJsSnippet", () => {
  it("returns an ObjectPath for a pure member-access chain", () => {
    const expr = buildDynamicExprFromJsSnippet("$ctx.foo.bar");
    expect(expr).toBeInstanceOf(ObjectPath);
    expect((expr as ObjectPath).path).toEqual(["$ctx", "foo", "bar"]);
  });

  it("returns a CustomCode for an operator expression", () => {
    const expr = buildDynamicExprFromJsSnippet('$ctx.foo ?? "x"');
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
});
