import { changeElementTool } from "@/wab/client/copilot/tools/changeElement";
import { readTool } from "@/wab/client/copilot/tools/read";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { ComponentType } from "@/wab/shared/core/components";
import * as Tpls from "@/wab/shared/core/tpls";
import { Component, TplTag } from "@/wab/shared/model/classes";

let studioCtx: StudioCtx;
let page: Component;

beforeEach(() => {
  ({ studioCtx } = fakeStudioCtx());
  page = studioCtx.addComponent("Page", { type: ComponentType.Page });
  jest.spyOn(studioCtx, "switchToArena").mockImplementation(() => {});
});

function rootDiv() {
  return page.tplTree as TplTag;
}

function addChild(tag: string): TplTag {
  const tpl = Tpls.mkTplTagX(tag);
  ensureVariantSetting(tpl, [getBaseVariant(page)]);
  studioCtx.focusedViewCtx()!.viewOps.insertAsChild(tpl, rootDiv());
  return tpl;
}

describe("changeElement copilot tool", () => {
  it("changes static HTML attrs and read serializes them", async () => {
    const link = addChild("a");

    const result = await changeElementTool.execute(studioCtx, {
      componentUuid: page.uuid,
      changes: [
        {
          tplUuid: link.uuid,
          attrs: {
            href: "/checkout",
            "aria-label": "Checkout link",
            tabIndex: 3,
            download: true,
          },
        },
      ],
    });
    expect(result).toContain(
      `Element "${link.uuid}" attrs changed successfully.`
    );
    const output = await readTool.execute(studioCtx, {
      elements: [{ componentUuid: page.uuid, elementUuid: link.uuid }],
    });

    expect(output).toContain(`<a id="${link.uuid}"`);
    expect(output).toContain(`href="/checkout"`);
    expect(output).toContain(`aria-label="Checkout link"`);
    expect(output).toContain(`tabIndex="3"`);
    expect(output).toContain(`download="true"`);
  });

  it("removes static HTML attrs and read omits them", async () => {
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

    const beforeRemoval = await readTool.execute(studioCtx, {
      elements: [{ componentUuid: page.uuid, elementUuid: link.uuid }],
    });
    expect(beforeRemoval).toContain(`href="/checkout"`);
    expect(beforeRemoval).toContain(`title="Checkout"`);

    await changeElementTool.execute(studioCtx, {
      componentUuid: page.uuid,
      changes: [{ tplUuid: link.uuid, attrs: { href: null } }],
    });

    const afterRemoval = await readTool.execute(studioCtx, {
      elements: [{ componentUuid: page.uuid, elementUuid: link.uuid }],
    });
    expect(afterRemoval).not.toContain(`href="/checkout"`);
    expect(afterRemoval).toContain(`title="Checkout"`);
  });
});
