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
    assert(baseResult.isOk(), "expected base token created");
    const baseToken = baseResult.value;

    const aliasResult = createStyleToken({
      tplMgr,
      name: "text-primary",
      type: "Color",
      value: mkTokenRef(baseToken),
    });
    assert(aliasResult.isOk(), "expected alias token created");
    const aliasToken = aliasResult.value;

    expect(site.styleTokens).toContain(baseToken);
    expect(aliasToken.value).toEqual(mkTokenRef(baseToken));

    deleteStyleToken({ site, token: baseToken });

    expect(site.styleTokens).not.toContain(baseToken);
    // Reference is inlined
    expect(aliasToken.value).toEqual("#111827");
  });
});
