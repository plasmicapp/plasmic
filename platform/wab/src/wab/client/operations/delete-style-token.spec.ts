import { createStyleToken } from "@/wab/client/operations/create-style-token";
import { deleteStyleToken } from "@/wab/client/operations/delete-style-token";
import { mkTokenRef } from "@/wab/commons/StyleToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";

describe("deleteStyleToken", () => {
  function setup() {
    const site = createSite();
    const tplMgr = new TplMgr({ site });
    return { site, tplMgr };
  }

  it("inlines the deleted token's value into other tokens that reference it", () => {
    const { site, tplMgr } = setup();

    const baseResult = createStyleToken({
      tplMgr,
      name: "gray-900",
      type: "Color",
      value: "#111827",
    });
    assert(baseResult.result === "success", "expected base token created");

    const aliasResult = createStyleToken({
      tplMgr,
      name: "text-primary",
      type: "Color",
      value: mkTokenRef(baseResult.token),
    });
    assert(aliasResult.result === "success", "expected alias token created");

    expect(site.styleTokens).toContain(baseResult.token);
    expect(aliasResult.token.value).toEqual(mkTokenRef(baseResult.token));

    deleteStyleToken({ site, token: baseResult.token });

    expect(site.styleTokens).not.toContain(baseResult.token);
    // Reference is inlined
    expect(aliasResult.token.value).toEqual("#111827");
  });
});
