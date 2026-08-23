import { Route, route } from "@/wab/shared/route/route";

const ab = route("/:a/:b");
const abOpt = route("/:a{/:b}");
const abRep = route("/:a/*b");
const abOptRep = route("/:a{/*b}");

describe("Route", () => {
  test("fill adds query", () => {
    expect(abOpt.fill({ a: "foo" }, "q=qux")).toEqual("/foo?q=qux");
    expect(abOpt.fill({ a: "foo" }, { p: "poo", q: "qux" })).toEqual(
      "/foo?p=poo&q=qux"
    );
  });

  test("fill handles path-to-regexp empty string/array quirks", () => {
    // @ts-expect-error b is required
    expect(() => ab.fill({ a: "foo" })).toThrow();
    // @ts-expect-error b is required
    expect(() => ab.fill({ a: "foo", b: undefined })).toThrow();
    // Omit empty strings. Otherwise, fill() is inconsistent with parse().
    expect(() => ab.fill({ a: "foo", b: "" })).toThrow();
    expectToNotParse(ab, "/foo/");

    expect(abOpt.fill({ a: "foo" })).toEqual("/foo");
    expect(abOpt.fill({ a: "foo", b: undefined })).toEqual("/foo");
    expect(abOpt.fill({ a: "foo", b: "" })).toEqual("/foo");

    // @ts-expect-error b is required
    expect(() => abRep.fill({ a: "foo" })).toThrow();
    // @ts-expect-error b is required
    expect(() => abRep.fill({ a: "foo", b: undefined })).toThrow();
    // @ts-expect-error b is required
    expect(() => abRep.fill({ a: "foo", b: [] })).toThrow();
    expect(() => abRep.fill({ a: "foo", b: [""] })).toThrow();

    expect(abOptRep.fill({ a: "foo" })).toEqual("/foo");
    expect(abOptRep.fill({ a: "foo", b: undefined })).toEqual("/foo");
    // Omit empty arrays. Otherwise, fill() would error.
    expect(abOptRep.fill({ a: "foo", b: [] })).toEqual("/foo");
    // Omit empty strings in arrays. Otherwise, fill() would return "/foo//".
    expect(abOptRep.fill({ a: "foo", b: [""] })).toEqual("/foo");
  });

  test("parse handles illegal input", () => {
    expect(ab.parse("/foo%/bar")).toBeNull();
    expect(ab.parse("/foo/bar%")).toBeNull();
    expect(ab.parse("/foo/bar/%")).toBeNull();
  });

  function expectToNotParse<PathParams extends {}>(
    r: Route<PathParams>,
    path: string
  ) {
    expect(r.parse(path, false)).toBeNull();
    expect(r.parse(path, true)).toBeNull();
  }

  const prefix = "prefix";
  const exact = "exact";
  const roundTrip = "roundTrip";

  function expectToParse<PathParams extends {}>(
    r: Route<PathParams>,
    path: string,
    params: PathParams,
    matchLevel: typeof prefix | typeof exact | typeof roundTrip
  ) {
    expect(r.parse(path, false)).toEqual(params);

    if (matchLevel === prefix) {
      expect(r.parse(path, true)).toBeNull();
    } else {
      expect(r.parse(path, true)).toEqual(params);
    }

    if (matchLevel === roundTrip) {
      expect(r.fill(params)).toEqual(path);
    } else {
      expect(r.fill(params)).not.toEqual(path);
    }
  }

  // prettier-ignore
  test("parse (and maybe fill round-trip)", () => {
    expectToNotParse(ab, "/foo");
    expectToNotParse(ab, "/foo/");
    expectToNotParse(ab, "/foo//");
    expectToParse(ab, "/foo/bar", { a: "foo", b: "bar" }, roundTrip);
    expectToParse(ab, "/foo/bar/", { a: "foo", b: "bar" }, exact);
    expectToParse(ab, "/foo/bar/qux", { a: "foo", b: "bar" }, prefix);
    expectToParse(ab, "/foo/bar/qux/", { a: "foo", b: "bar" }, prefix);

    expectToParse(abOpt, "/foo", { a: "foo" }, roundTrip);
    expectToParse(abOpt, "/foo/", { a: "foo" }, exact);
    expectToNotParse(abOpt, "/foo//");
    expectToParse(abOpt, "/foo/bar", { a: "foo", b: "bar" }, roundTrip);
    expectToParse(abOpt, "/foo/bar/", { a: "foo", b: "bar" }, exact);
    expectToParse(abOpt, "/foo/bar/qux", { a: "foo", b: "bar" }, prefix);
    expectToParse(abOpt, "/foo/bar/qux/", { a: "foo", b: "bar" }, prefix);

    expectToNotParse(abRep, "/foo");
    expectToNotParse(abRep, "/foo/");
    expectToNotParse(abRep, "/foo//");
    expectToParse(abRep, "/foo/bar", { a: "foo", b: ["bar"] }, roundTrip);
    expectToParse(abRep, "/foo/bar/", { a: "foo", b: ["bar"] }, exact);
    expectToParse(abRep, "/foo/bar/qux", { a: "foo", b: ["bar", "qux"] }, roundTrip);
    expectToParse(abRep, "/foo/bar/qux/", { a: "foo", b: ["bar", "qux"] }, exact);

    expectToParse(abOptRep, "/foo", { a: "foo" }, roundTrip);
    expectToParse(abOptRep, "/foo/", { a: "foo" }, exact);
    expectToNotParse(abOptRep, "/foo//");
    expectToParse(abOptRep, "/foo/bar", { a: "foo", b: ["bar"] }, roundTrip);
    expectToParse(abOptRep, "/foo/bar/", { a: "foo", b: ["bar"] }, exact);
    expectToParse(abOptRep, "/foo/bar/qux", { a: "foo", b: ["bar", "qux"] }, roundTrip);
    expectToParse(abOptRep, "/foo/bar/qux/", { a: "foo", b: ["bar", "qux"] }, exact);
  });

  // prettier-ignore
  test("encoding and decoding", () => {
    expectToParse(ab, "/foo%20foo/bar", { a: "foo foo", b: "bar" }, roundTrip);
    expectToParse(ab, "/foo%40foo/bar", { a: "foo@foo", b: "bar" }, roundTrip);
    expectToParse(ab, "/foo%2F/bar", { a: "foo/", b: "bar" }, roundTrip);
    expectToParse(ab, "/foo/%2Fbar", { a: "foo", b: "/bar" }, roundTrip);
    expectToParse(abRep, "/foo/bar%2Fqux",  { a: "foo", b: ["bar/qux"] }, roundTrip);
    expectToParse(abRep, "/foo/bar/-/qux", { a: "foo", b: ["bar", "-", "qux"] }, roundTrip);
  });
});
