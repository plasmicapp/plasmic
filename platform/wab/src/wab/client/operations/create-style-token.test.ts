import { createStyleToken } from "@/wab/client/operations/create-style-token";
import { StyleTokenType, mkTokenRef } from "@/wab/commons/StyleToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";

describe("createStyleToken", () => {
  function setup() {
    const site = createSite();
    const tplMgr = new TplMgr({ site });
    return { site, tplMgr };
  }

  it("creates a Color token with the given value", () => {
    const { site, tplMgr } = setup();
    const before = site.styleTokens.length;

    const result = createStyleToken({
      site,
      tplMgr,
      name: "primary",
      type: "Color",
      value: "#ff0000",
    });

    assert(result.isOk(), "expected success result");
    expect(site.styleTokens.length).toEqual(before + 1);
    expect(result.value.name).toEqual("primary");
    expect(result.value.type).toEqual("Color");
    expect(result.value.value).toEqual("#ff0000");
    expect(result.value.variantedValues).toEqual([]);
  });

  it("errors on empty name", () => {
    const { site, tplMgr } = setup();
    const result = createStyleToken({
      site,
      tplMgr,
      name: "   ",
      type: "Color",
      value: "#000",
    });
    expect(result.isErr()).toBe(true);
  });

  it("errors on a token ref that is not an existing token of the same type", () => {
    const { site, tplMgr } = setup();
    const create = (type: StyleTokenType, value: string) =>
      createStyleToken({ site, tplMgr, name: "token", type, value });

    const color = create("Color", "#ff0000");
    assert(color.isOk(), "expected success result");
    expect(create("Color", mkTokenRef(color.value)).isOk()).toBe(true);
    expect(create("Spacing", `VAR( --token-${color.value.uuid})`).isErr()).toBe(
      true,
    );
    expect(create("Color", "var(--token-doesnotexist)").isErr()).toBe(true);
    expect(
      create(
        "Color",
        `var(--token-${color.value.uuid}, var(--token-missing))`,
      ).isErr(),
    ).toBe(true);
  });

  it("trims the value before validating and storing it", () => {
    const { site, tplMgr } = setup();
    const create = (value: string) =>
      createStyleToken({ site, tplMgr, name: "token", type: "Color", value });

    const color = create(" #ff0000\n");
    assert(color.isOk(), "expected success result");
    expect(color.value.value).toEqual("#ff0000");

    const alias = create(` ${mkTokenRef(color.value)} `);
    assert(alias.isOk(), "expected success result");
    expect(alias.value.value).toEqual(mkTokenRef(color.value));
  });

  it("errors on a value that breaks out of its CSS declaration", () => {
    const { site, tplMgr } = setup();
    const result = createStyleToken({
      site,
      tplMgr,
      name: "token",
      type: "Color",
      value: "red; } body { display: none } .x {",
    });
    expect(result.isErr()).toBe(true);
  });
});
