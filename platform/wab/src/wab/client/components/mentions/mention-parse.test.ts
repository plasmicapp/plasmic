import {
  mkMentionRaw,
  parseMention,
} from "@/wab/client/components/mentions/mention-parse";

describe("parseMention", () => {
  it("parses a site-scoped mention", () => {
    expect(parseMention("Component:c1")).toEqual({
      type: "SiteScoped",
      tag: "Component",
      uuid: "c1",
    });
  });

  it("parses a Tpl mention as an owner and a uuid", () => {
    expect(parseMention("Tpl:comp1/tpl1")).toEqual({
      type: "ComponentScoped",
      tag: "Tpl",
      componentUuid: "comp1",
      uuid: "tpl1",
    });
  });

  it("parses a component variant with its owner", () => {
    expect(parseMention("Variant:comp1/v1")).toEqual({
      type: "ComponentScoped",
      tag: "Variant",
      componentUuid: "comp1",
      uuid: "v1",
    });
  });

  it("parses a user mention", () => {
    expect(parseMention("abc@xyz.com")).toEqual({
      type: "user",
      email: "abc@xyz.com",
    });
    expect(parseMention("support@mail.example.co.uk")).toEqual({
      type: "user",
      email: "support@mail.example.co.uk",
    });
  });

  it("rejects a pair on a site-scoped tag", () => {
    expect(parseMention("Component:comp1/c1")).toBeUndefined();
  });

  it("rejects a component-scoped tag without an owner", () => {
    expect(parseMention("Tpl:tpl1")).toBeUndefined();
    expect(parseMention("Variant:v1")).toBeUndefined();
  });

  it("returns undefined for non-mention text", () => {
    expect(parseMention("just text")).toBeUndefined();
  });

  it("returns undefined for an unrecognized tag", () => {
    expect(parseMention("widget:w1")).toBeUndefined();
    expect(parseMention("Widget:w1")).toBeUndefined();
  });

  it("returns undefined without a uuid", () => {
    expect(parseMention("Component:")).toBeUndefined();
  });

  it("rejects an invalid email", () => {
    expect(parseMention("abc@xyz@.com")).toBeUndefined();
    expect(parseMention("user@domain .com")).toBeUndefined();
  });
});

describe("mkMentionRaw", () => {
  it("round-trips a component-scoped mention", () => {
    const target = {
      type: "ComponentScoped",
      tag: "Tpl",
      componentUuid: "comp1",
      uuid: "tpl1",
    } as const;
    expect(parseMention(mkMentionRaw(target))).toEqual(target);
  });

  it("round-trips a site-scoped mention", () => {
    const target = {
      type: "SiteScoped",
      tag: "StyleToken",
      uuid: "t1",
    } as const;
    expect(parseMention(mkMentionRaw(target))).toEqual(target);
  });

  it("round-trips a user mention", () => {
    const target = { type: "user", email: "abc@xyz.com" } as const;
    expect(parseMention(mkMentionRaw(target))).toEqual(target);
  });
});
