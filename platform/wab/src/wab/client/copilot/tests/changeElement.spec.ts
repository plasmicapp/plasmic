import { addChild as addChildToPage } from "@/wab/client/copilot/tests/utils";
import { changeElementTool } from "@/wab/client/copilot/tools/changeElement";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { ComponentType } from "@/wab/shared/core/components";
import { customCode, tryExtractJson } from "@/wab/shared/core/exprs";
import { Component, TplTag } from "@/wab/shared/model/classes";

let studioCtx: StudioCtx;
let page: Component;

beforeEach(() => {
  ({ studioCtx } = fakeStudioCtx());
  page = studioCtx.addComponent("Page", { type: ComponentType.Page });
  jest.spyOn(studioCtx, "switchToArena").mockImplementation(() => {});
});

function addChild(tag: string): TplTag {
  return addChildToPage(studioCtx, page, tag);
}

describe("changeElement copilot tool", () => {
  it("changes static HTML attrs on tpl variant settings", async () => {
    const link = addChild("a");

    const result = await changeElementTool.execute(studioCtx, {
      componentUuid: page.uuid,
      changes: [
        {
          tplUuid: link.uuid,
          attrs: {
            href: "/checkout",
            "aria-label": "Checkout link",
            title: "",
            tabIndex: 3,
            download: true,
          },
        },
      ],
    });
    expect(result).toContain(
      `Element "${link.uuid}" attrs changed successfully.`
    );
    const vs = ensureVariantSetting(link, [getBaseVariant(page)]);
    expect(tryExtractJson(vs.attrs.href)).toEqual("/checkout");
    expect(tryExtractJson(vs.attrs["aria-label"])).toEqual("Checkout link");
    expect(tryExtractJson(vs.attrs.title)).toEqual("");
    expect(tryExtractJson(vs.attrs.tabIndex)).toEqual(3);
    expect(tryExtractJson(vs.attrs.download)).toEqual(true);
  });

  it("removes static HTML attrs from tpl variant settings", async () => {
    const link = addChild("a");

    await changeElementTool.execute(studioCtx, {
      componentUuid: page.uuid,
      changes: [
        {
          tplUuid: link.uuid,
          attrs: {
            href: "/checkout",
            title: "Checkout",
          },
        },
      ],
    });

    const vs = ensureVariantSetting(link, [getBaseVariant(page)]);
    expect(tryExtractJson(vs.attrs.href)).toEqual("/checkout");
    expect(tryExtractJson(vs.attrs.title)).toEqual("Checkout");

    await changeElementTool.execute(studioCtx, {
      componentUuid: page.uuid,
      changes: [{ tplUuid: link.uuid, attrs: { href: null } }],
    });

    expect(vs.attrs.href).toBeUndefined();
    expect(tryExtractJson(vs.attrs.title)).toEqual("Checkout");
  });

  it("changes attrs even when a dynamic style expression blocks styles", async () => {
    const link = addChild("a");
    const vs = ensureVariantSetting(link, [getBaseVariant(page)]);
    vs.attrs.style = customCode("$props.style");

    const result = await changeElementTool.execute(studioCtx, {
      componentUuid: page.uuid,
      changes: [
        {
          tplUuid: link.uuid,
          styles: { color: "red" },
          attrs: { href: "/order" },
        },
      ],
    });

    expect(result).toContain("dynamic style expression");
    expect(result).toContain(
      `Element "${link.uuid}" attrs changed successfully.`
    );

    expect(tryExtractJson(vs.attrs.href)).toEqual("/order");
    expect(vs.rs.values.color).toBeUndefined();
  });
});
