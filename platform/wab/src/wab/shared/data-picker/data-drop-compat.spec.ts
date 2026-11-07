import { code, codeLit } from "@/wab/shared/core/exprs";
import {
  canDropDataOnPropType,
  computeDropCollectionExpr,
  computeDropReplacementExpr,
  computeDropTextExpr,
} from "@/wab/shared/data-picker/data-drop-compat";
import {
  ExprText,
  ObjectPath,
  RawText,
  TemplatedString,
  ensureKnownCustomCode,
  ensureKnownObjectPath,
  ensureKnownTemplatedString,
} from "@/wab/shared/model/classes";

describe("canDropDataOnPropType", () => {
  it("allows scalar values on compatible primitive props", () => {
    expect(canDropDataOnPropType("number", "string")).toBe(true);
    expect(canDropDataOnPropType("number", "number")).toBe(true);
    expect(canDropDataOnPropType("null", "number")).toBe(true);
    expect(canDropDataOnPropType("boolean", "boolean")).toBe(true);
    expect(
      canDropDataOnPropType("string", {
        type: "choice",
        options: ["primary", "secondary"],
      }),
    ).toBe(true);
  });

  it("rejects scalars of the wrong primitive type", () => {
    expect(canDropDataOnPropType("string", "number")).toEqual(
      expect.any(String),
    );
    expect(canDropDataOnPropType("number", "boolean")).toEqual(
      expect.any(String),
    );
  });

  it("only allows collections and objects on explicitly compatible props", () => {
    expect(canDropDataOnPropType("array", { type: "array" })).toBe(true);
    expect(canDropDataOnPropType("array", "object")).toBe(true);
    expect(canDropDataOnPropType("array", { type: "dataSourceOpData" })).toBe(
      true,
    );
    expect(canDropDataOnPropType("array", "string")).toEqual(
      expect.any(String),
    );
    expect(canDropDataOnPropType("object", "object")).toBe(true);
    expect(canDropDataOnPropType("object", { type: "array" })).toEqual(
      expect.any(String),
    );
  });

  it("rejects functions", () => {
    expect(canDropDataOnPropType("function", "object")).toEqual(
      expect.any(String),
    );
  });
});

describe("computeDropReplacementExpr", () => {
  const path = ["$state", "name"];

  it("replaces an unset value with no fallback", () => {
    const expr = ensureKnownObjectPath(
      computeDropReplacementExpr(undefined, path),
    );
    expect(expr.path).toEqual(path);
    expect(expr.fallback).toBeNull();
  });

  it("uses a static value as the fallback", () => {
    const fromString = ensureKnownObjectPath(
      computeDropReplacementExpr("hello", path),
    );
    expect(ensureKnownCustomCode(fromString.fallback).code).toEqual(
      codeLit("hello").code,
    );

    const fromTemplate = ensureKnownObjectPath(
      computeDropReplacementExpr(
        new TemplatedString({ text: ["hello ", "world"] }),
        path,
      ),
    );
    expect(ensureKnownCustomCode(fromTemplate.fallback).code).toEqual(
      codeLit("hello world").code,
    );

    const fromLit = ensureKnownObjectPath(
      computeDropReplacementExpr(codeLit("hi"), path),
    );
    expect(ensureKnownCustomCode(fromLit.fallback).code).toEqual(
      codeLit("hi").code,
    );
  });

  it("replaces a lone dynamic expr, keeping its fallback", () => {
    const current = new ObjectPath({
      path: ["$queries", "q"],
      fallback: codeLit("hi"),
    });
    const bare = ensureKnownObjectPath(
      computeDropReplacementExpr(current, path),
    );
    expect(bare.path).toEqual(path);
    expect(ensureKnownCustomCode(bare.fallback).code).toEqual(
      codeLit("hi").code,
    );

    const wrapped = ensureKnownObjectPath(
      computeDropReplacementExpr(
        new TemplatedString({ text: ["", current, ""] }),
        path,
      ),
    );
    expect(wrapped.path).toEqual(path);
    expect(ensureKnownCustomCode(wrapped.fallback).code).toEqual(
      codeLit("hi").code,
    );
  });

  it("defers mixed templated strings to the editor", () => {
    expect(
      computeDropReplacementExpr(
        new TemplatedString({
          text: [
            "hello ",
            new ObjectPath({ path: ["$state", "x"], fallback: null }),
          ],
        }),
        path,
      ),
    ).toBeUndefined();
  });
});

describe("computeDropTextExpr", () => {
  const path = ["$state", "name"];
  const raw = new RawText({ text: "Hello", markers: [] });
  const bound = new ExprText({
    expr: new ObjectPath({ path: ["$state", "x"], fallback: codeLit("Guest") }),
    html: false,
  });

  it("keeps the static text or the existing fallback of a text block", () => {
    const fromRaw = ensureKnownObjectPath(
      computeDropTextExpr(raw, path, false),
    );
    expect(ensureKnownCustomCode(fromRaw.fallback).code).toEqual(
      codeLit("Hello").code,
    );
    const fromBound = ensureKnownObjectPath(
      computeDropTextExpr(bound, path, false),
    );
    expect(fromBound.path).toEqual(path);
    expect(ensureKnownCustomCode(fromBound.fallback).code).toEqual(
      codeLit("Guest").code,
    );
  });

  it("keeps rich-text sub-nodes templated", () => {
    const [prefix, pill] = ensureKnownTemplatedString(
      computeDropTextExpr(raw, path, true),
    ).text;
    expect(prefix).toEqual("Hello");
    expect(ensureKnownObjectPath(pill).path).toEqual(path);

    const [, replaced] = ensureKnownTemplatedString(
      computeDropTextExpr(bound, path, true),
    ).text;
    expect(ensureKnownObjectPath(replaced).path).toEqual(path);
  });
});

describe("computeDropCollectionExpr", () => {
  const path = ["$q", "users", "data"];

  it("keeps an existing fallback, else falls back to an empty list", () => {
    const kept = computeDropCollectionExpr(
      new ObjectPath({ path: ["$q", "old"], fallback: code("([1])") }),
      path,
    );
    expect(ensureKnownCustomCode(kept.fallback).code).toEqual("([1])");
    const defaulted = computeDropCollectionExpr(
      new ObjectPath({ path: ["[2, 3, 4]"], fallback: null }),
      path,
    );
    expect(ensureKnownObjectPath(defaulted).path).toEqual(path);
    expect(ensureKnownCustomCode(defaulted.fallback).code).toEqual("([])");
  });
});
