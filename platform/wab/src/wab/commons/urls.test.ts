import { encodeUriParams } from "@/wab/commons/urls";

describe("encodeUriParams", () => {
  it("encodes 0 params", () => {
    expect(encodeUriParams([])).toEqual("");
  });
  it("encodes 1 param", () => {
    expect(encodeUriParams([["hello", "world"]])).toEqual("hello=world");
  });
  it("encodes a lot of params", () => {
    expect(
      encodeUriParams([
        ["string", "foo"],
        ["number", 1],
        ["boolean", true],
        ["null", null],
        ["undefined", undefined],
      ])
    ).toEqual("string=foo&number=1&boolean=true&null=null&undefined=undefined");
  });
  it("escapes symbols", () => {
    expect(encodeUriParams([["params", "foo=bar&baz=qux"]])).toEqual(
      "params=foo%3Dbar%26baz%3Dqux"
    );
  });
});
