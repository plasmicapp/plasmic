import {
  hasUnexpected$$Usage,
  parse$$PropertyAccesses,
} from "@/wab/shared/utils/regex-dollardollar";

function expect$$PropertyAccesses(code: string, expected: string[]) {
  expect(parse$$PropertyAccesses(code)).toEqual(expected);
  expect(hasUnexpected$$Usage(code)).toBe(false);
}

function expectHasUnexpected$$Usage(code: string) {
  expect(parse$$PropertyAccesses(code)).toBeEmpty();
  expect(hasUnexpected$$Usage(code)).toBe(true);
}

function expectNo$$Usage(code: string) {
  expect(parse$$PropertyAccesses(code)).toBeEmpty();
  expect(hasUnexpected$$Usage(code)).toBe(false);
}

describe("$$ functions", () => {
  it("should parse out $$ property accesses in code", () => {
    expect$$PropertyAccesses(
      `
      const _ = $$.lodash;
      const uuid =
        $$
          .uuid
          .v4();
    `,
      ["lodash", "uuid.v4"]
    );
  });
  it("should return $$ property accesses", () => {
    expect$$PropertyAccesses("$$.foo", ["foo"]);
    expect$$PropertyAccesses("$$.foo()", ["foo"]);
    expect$$PropertyAccesses("$$.foo().bar", ["foo"]);
    expect$$PropertyAccesses("$$.foo.bar", ["foo.bar"]);
    expect$$PropertyAccesses("$$.foo.bar()", ["foo.bar"]);
    expect$$PropertyAccesses("$$.$_世界_unicode", ["$_世界_unicode"]);
  });
  it("should return $$ property accesses up to 2 levels ", () => {
    expect$$PropertyAccesses("$$.foo.bar.baz", ["foo.bar"]);
    expect$$PropertyAccesses("$$.foo.bar.baz.qux", ["foo.bar"]);
  });
  test("code with unexpected $$ usage", () => {
    expectHasUnexpected$$Usage("const dd = $$;");
    expectHasUnexpected$$Usage("$$.");
    expectHasUnexpected$$Usage("$$..InvalidJs");
    expectHasUnexpected$$Usage("$$.123InvalidJsIdentifier");
  });
  test("code without $$ usage", () => {
    expectNo$$Usage("foo");
    expectNo$$Usage("$.foo");
    expectNo$$Usage("$ $.foo");
    expectNo$$Usage("$$foo.bar");
    expectNo$$Usage("$$$.foo");
    expectNo$$Usage("foo$$.bar");
  });
  test("code with $$ property access AND unexpected usage", () => {
    const code = `
      const dd = $$;
      const lodash = $$.lodash;
      const uuid = $$.uuid.v4();
    `;
    expect(parse$$PropertyAccesses(code)).toEqual(["lodash", "uuid.v4"]);
    expect(hasUnexpected$$Usage(code)).toBe(true);
  });
});
