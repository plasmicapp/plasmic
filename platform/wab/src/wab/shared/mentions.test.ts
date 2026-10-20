import { MENTION_REGEX } from "@/wab/shared/mentions";

describe("MENTION_REGEX", () => {
  it("splits text into alternating [text, raw, text, raw, ...]", () => {
    expect("use @<token:t1> here @<page:p1>".split(MENTION_REGEX)).toEqual([
      "use ",
      "token:t1",
      " here ",
      "page:p1",
      "",
    ]);
  });

  it("does not match without the leading @", () => {
    expect("#<a@b.co>".split(MENTION_REGEX)).toEqual(["#<a@b.co>"]);
  });

  it("does not match an unclosed mention", () => {
    expect("half @<page:p1".split(MENTION_REGEX)).toEqual(["half @<page:p1"]);
  });
});
