import { _testOnlyWebImporterUtils } from "@/wab/client/WebImporter";
import { ReadableClipboard } from "@/wab/client/clipboard/ReadableClipboard";
import { paste } from "@/wab/client/clipboard/paste";
import { multiColorSvgData } from "@/wab/client/clipboard/test/clipboard-test-data";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { WIElement } from "@/wab/client/web-importer/types";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import * as ImageAssets from "@/wab/shared/core/image-assets";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplImageTag } from "@/wab/shared/core/tpls";
import { Component, isKnownCustomCode } from "@/wab/shared/model/classes";

let studioCtx: StudioCtx;
let api: ReturnType<typeof fakeStudioCtx>["api"];
let page: Component;
let pageViewCtx: ViewCtx;

const { WI_IMPORTER_HEADER } = _testOnlyWebImporterUtils;

function getWebImporterDataToClipboard(wiElement: WIElement) {
  return ReadableClipboard.fromData({
    "text/plain": `${WI_IMPORTER_HEADER}${JSON.stringify(wiElement)}`,
  });
}

describe("WebImporter", () => {
  beforeEach(() => {
    const studioCtxDeps = fakeStudioCtx();
    studioCtx = studioCtxDeps.studioCtx;
    api = studioCtxDeps.api;

    page = studioCtx.addComponent("Page", {
      type: ComponentType.Page,
    });
    pageViewCtx = studioCtx.focusedViewCtx()!;
  });

  describe("pasteFromWebImporter", () => {
    it("pastes simple container with text from web importer", async () => {
      pageViewCtx.selectNewTpl(page.tplTree);

      // Create simple wiTree test data
      const wiTree: WIElement = {
        type: "container",
        tag: "div",
        attrs: {
          __name: "test-container",
        },
        variantSettings: [
          {
            unsanitizedStyles: {},
            safeStyles: {
              display: "flex",
              flexDirection: "column",
            },
            unsafeStyles: {},
            variantCombo: [{ type: "base" }],
          },
        ],
        children: [
          {
            type: "text",
            tag: "span",
            text: "Hello World",
            variantSettings: [
              {
                unsanitizedStyles: {},
                safeStyles: {},
                unsafeStyles: {},
                variantCombo: [{ type: "base" }],
              },
            ],
          },
        ],
      };

      // Create clipboard data with web importer header
      const clipboard = getWebImporterDataToClipboard(wiTree);

      expect(
        await paste({
          clipboard,
          studioCtx,
          cursorClientPt: undefined,
        })
      ).toBe(true);

      const rootChildren = Tpls.tplChildren(page.tplTree);
      expect(rootChildren).toHaveLength(1);
      const pastedTpl = rootChildren[0];

      // Verify it's a container tpl
      expect(Tpls.getTagOrComponentName(pastedTpl)).toEqual("div");
      const pastedTplChildren = Tpls.tplChildren(pastedTpl);
      expect(pastedTplChildren).toHaveLength(1);

      // Verify the child text tpl
      const textTpl = pastedTplChildren[0];
      expect(Tpls.getTagOrComponentName(textTpl)).toEqual("span");
      expect(Tpls.getTplTextBlockContent(textTpl, pageViewCtx)).toEqual(
        "Hello World"
      );
      expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
    });

    it("pastes SVG from web importer", async () => {
      pageViewCtx.selectNewTpl(page.tplTree);

      const { dataUri, xml: homeSvg } = multiColorSvgData();

      // Mock the image upload API
      api.uploadImageFile.mockImplementation(async (req) => {
        req.imageFile;
        return {
          dataUri,
          height: 100,
          width: 100,
        };
      });

      const wiTree: WIElement = {
        type: "container",
        tag: "div",
        variantSettings: [
          {
            unsanitizedStyles: {
              width: "100%",
            },
            safeStyles: {
              width: "100%",
            },
            unsafeStyles: {},
            variantCombo: [
              {
                type: "base",
              },
            ],
          },
        ],
        children: [
          {
            type: "svg",
            tag: "svg",
            fillColor: undefined,
            outerHtml: homeSvg,
            width: "100px",
            height: "100px",
            variantSettings: [
              {
                unsanitizedStyles: {},
                safeStyles: {},
                unsafeStyles: {},
                variantCombo: [{ type: "base" }],
              },
            ],
          },
        ],
        attrs: {
          style: "width: 100%;",
          __name: "",
        },
      };

      const clipboard = getWebImporterDataToClipboard(wiTree);

      expect(
        await paste({
          clipboard,
          studioCtx,
          cursorClientPt: undefined,
        })
      ).toBe(true);

      const rootChildren = Tpls.tplChildren(page.tplTree);
      expect(rootChildren).toHaveLength(1);
      const pastedTpl = rootChildren[0];

      // Verify it's a container tpl
      expect(Tpls.getTagOrComponentName(pastedTpl)).toEqual("div");
      const pastedTplChildren = Tpls.tplChildren(pastedTpl);
      expect(pastedTplChildren).toHaveLength(1);

      // Verify the child tpl to be an image because it's a multicolor SVG
      const imgTpl = pastedTplChildren[0];
      expect(Tpls.getTagOrComponentName(imgTpl)).toEqual("img");

      // Verify it's an img tpl (SVG converted to image asset)
      expect(Tpls.isTplImage(imgTpl)).toBe(true);
      expect(
        ImageAssets.getOnlyAssetRef(imgTpl as TplImageTag)?.dataUri
      ).toEqual(dataUri);

      // Verify img tpl to be lazy loaded
      const baseVs = pageViewCtx
        .variantTplMgr()
        .ensureBaseVariantSetting(imgTpl as TplImageTag);
      assert(
        isKnownCustomCode(baseVs.attrs.loading),
        "imgTpl baseVs loading attr should be CustomCode"
      );
      expect(baseVs.attrs.loading.code).toBe('"lazy"');

      expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
    });
  });
});
