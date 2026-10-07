import { fakeStudioCtx } from "@/wab/client/__testonly__/fake-init-ctx";
import { ReadableClipboard } from "@/wab/client/clipboard/ReadableClipboard";
import {
  multiColorSvgData,
  pngData,
  svgData,
} from "@/wab/client/clipboard/__testonly__/clipboard-test-data";
import { paste } from "@/wab/client/clipboard/paste";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import * as ImageAssets from "@/wab/shared/core/image-assets";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplImageTag } from "@/wab/shared/core/tpls";
import {
  Component,
  TplNode,
  isKnownCustomCode,
} from "@/wab/shared/model/classes";

let studioCtx: StudioCtx;
let api: ReturnType<typeof fakeStudioCtx>["api"];
let page: Component;
let pageViewCtx: ViewCtx;

function htmlToClipboard(html: string) {
  return ReadableClipboard.fromData({
    "text/plain": html,
  });
}

function getPastedTpl(pageTplTree: TplNode) {
  const rootChildren = Tpls.tplChildren(pageTplTree);
  expect(rootChildren).toHaveLength(1);
  const pastedTpl = rootChildren[0];
  return { pastedTpl };
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
      const htmlStr = `<div>Hello World</div>`;
      const clipboard = htmlToClipboard(htmlStr);

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard,
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);

      // Verify it's a container tpl
      expect(Tpls.getTagOrComponentName(pastedTpl)).toEqual("div");
      const pastedTplChildren = Tpls.tplChildren(pastedTpl);
      expect(pastedTplChildren).toHaveLength(1);

      // Verify the child text tpl
      const textTpl = pastedTplChildren[0];
      expect(Tpls.getTagOrComponentName(textTpl)).toEqual("span");
      expect(Tpls.getTplTextBlockContent(textTpl, pageViewCtx)).toEqual(
        "Hello World",
      );
      expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
    });

    it("pastes multi-color SVG from web importer as image", async () => {
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

      const htmlStr = `<div>${homeSvg}</div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);

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
        ImageAssets.getOnlyAssetRef(imgTpl as TplImageTag)?.dataUri,
      ).toEqual(dataUri);

      // Verify img tpl to be lazy loaded
      const baseVs = pageViewCtx
        .variantTplMgr()
        .ensureBaseVariantSetting(imgTpl as TplImageTag);
      assert(
        isKnownCustomCode(baseVs.attrs.loading),
        "imgTpl baseVs loading attr should be CustomCode",
      );
      expect(baseVs.attrs.loading.code).toBe('"lazy"');

      expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
    });

    it("pastes single-color SVG from web importer as icon", async () => {
      const { processedDataUri, xml: iconSvg } = svgData();

      const htmlStr = `<div>${iconSvg}</div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);

      // Verify it's a container tpl
      expect(Tpls.getTagOrComponentName(pastedTpl)).toEqual("div");
      const pastedTplChildren = Tpls.tplChildren(pastedTpl);
      expect(pastedTplChildren).toHaveLength(1);

      // Verify the child tpl to be an icon because it's a single-color SVG
      const iconTpl = pastedTplChildren[0];
      expect(Tpls.isTplIcon(iconTpl)).toBe(true);

      // Verify it's an icon with the correct dataUri (should have height="1em" and style="fill: currentColor;")
      expect(
        ImageAssets.getOnlyAssetRef(iconTpl as TplImageTag)?.dataUri,
      ).toEqual(processedDataUri);

      expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
    });

    it("pastes an image embedded in the html as an image asset", async () => {
      const { dataUri, width, height } = pngData();
      api.uploadImageFile.mockImplementation(async () => ({
        dataUri,
        width,
        height,
      }));

      const htmlStr = `<div><img src="${dataUri}" alt="a red dot" /></div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);
      const pastedTplChildren = Tpls.tplChildren(pastedTpl);
      expect(pastedTplChildren).toHaveLength(1);

      const imgTpl = pastedTplChildren[0];
      expect(Tpls.getTagOrComponentName(imgTpl)).toEqual("img");
      expect(Tpls.isTplImage(imgTpl)).toBe(true);

      // The image is uploaded as an asset now.
      expect(studioCtx.site.imageAssets).toHaveLength(1);
      expect(
        ImageAssets.getOnlyAssetRef(imgTpl as TplImageTag)?.dataUri,
      ).toEqual(dataUri);
    });

    it("sanitizes a pasted svg image whose data uri media type has parameters", async () => {
      const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="x" onerror="window.pwned=42"></image></svg>`;
      const dataUri = `data:image/svg+xml;charset=utf-8;base64,${btoa(svgXml)}`;

      const htmlStr = `<div><img src="${dataUri}" /></div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      // The svg went through the sanitizer, and whatever got stored carries
      // no event handlers.
      expect(api.processSvg).toHaveBeenCalled();
      expect(studioCtx.site.imageAssets).toHaveLength(1);
      expect(studioCtx.site.imageAssets[0].dataUri).not.toContain("onerror");
    });

    it("uploads an image embedded in a css background and points the style at it", async () => {
      const { dataUri, width, height } = pngData();
      api.uploadImageFile.mockImplementation(async () => ({
        dataUri,
        width,
        height,
      }));

      const htmlStr = `<style>
        .hero { background: url(${dataUri}) center / cover no-repeat; }
      </style><div class="hero">Hero</div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);

      expect(studioCtx.site.imageAssets).toHaveLength(1);
      const asset = studioCtx.site.imageAssets[0];
      expect(asset.dataUri).toEqual(dataUri);

      const baseVs = pageViewCtx
        .variantTplMgr()
        .ensureBaseVariantSetting(pastedTpl);
      expect(baseVs.rs.values["background"]).toEqual(
        `${ImageAssets.mkImageAssetRef(asset)} center / cover no-repeat`,
      );
      // Nothing was left behind in the inline style attribute.
      expect(baseVs.attrs["style"]).toBeUndefined();
    });

    it("reuses one image asset when the same embedded image is used twice", async () => {
      const { dataUri, width, height } = pngData();
      api.uploadImageFile.mockImplementation(async () => ({
        dataUri,
        width,
        height,
      }));

      const htmlStr = `<style>
        .hero { background: url(${dataUri}); }
      </style><div>
        <img src="${dataUri}" />
        <div class="hero">Hero</div>
      </div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);
      const [imgTpl, bgTpl] = Tpls.tplChildren(pastedTpl);

      expect(studioCtx.site.imageAssets).toHaveLength(1);
      const asset = studioCtx.site.imageAssets[0];

      expect(ImageAssets.getOnlyAssetRef(imgTpl as TplImageTag)).toBe(asset);
      expect(
        pageViewCtx.variantTplMgr().ensureBaseVariantSetting(bgTpl).rs.values[
          "background"
        ],
      ).toEqual(ImageAssets.mkImageAssetRef(asset));
    });

    it("falls back to the image placeholder when the upload fails", async () => {
      const { dataUri } = pngData();
      api.uploadImageFile.mockImplementation(async () => {
        throw new Error("upload failed");
      });

      const htmlStr = `<div><img src="${dataUri}" /></div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);
      const imgTpl = Tpls.tplChildren(pastedTpl)[0];
      expect(Tpls.isTplImage(imgTpl)).toBe(true);

      // No asset was created and no src is set: this is the same state as a
      // freshly inserted Image, which the canvas renders as the placeholder.
      expect(studioCtx.site.imageAssets).toHaveLength(0);
      const baseVs = pageViewCtx
        .variantTplMgr()
        .ensureBaseVariantSetting(imgTpl);
      expect(baseVs.attrs.src).toBeUndefined();
    });

    it("pastes text with font-family and extracts only first font", async () => {
      // Create html with text element that has multi-font font-family
      const htmlStr = `<style>.text { font-family: "Playfair Display", Georgia, serif; }</style>
<div class="text">Text with multiple fonts</div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);

      // Verify it's a container tpl
      expect(Tpls.getTagOrComponentName(pastedTpl)).toEqual("div");
      const pastedTplChildren = Tpls.tplChildren(pastedTpl);
      expect(pastedTplChildren).toHaveLength(1);

      // Verify the child text tpl
      const textTpl = pastedTplChildren[0];
      expect(Tpls.getTagOrComponentName(textTpl)).toEqual("span");
      expect(Tpls.getTplTextBlockContent(textTpl, pageViewCtx)).toEqual(
        "Text with multiple fonts",
      );

      // Verify font-family in variant settings
      const baseVariantSetting = pageViewCtx
        .variantTplMgr()
        .ensureBaseVariantSetting(pastedTpl);

      // Check that font-family in ruleset values matches the first font only
      expect(baseVariantSetting.rs.values["font-family"]).toBe(
        "Playfair Display",
      );

      expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
    });

    it("pastes animations and animation sequences from web importer", async () => {
      // Create html with text element that has multi-font font-family
      const htmlStr = `
<style>
  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

.text { animation: fadeIn 1s linear infinite alternate-reverse; }
.text:hover { animation: none; }
</style>
<div class="text">Text with fadeIn animation</div>`;

      pageViewCtx.selectNewTpl(page.tplTree);
      expect(
        await paste({
          clipboard: htmlToClipboard(htmlStr),
          studioCtx,
          cursorClientPt: undefined,
        }),
      ).toBe(true);

      const { pastedTpl } = getPastedTpl(page.tplTree);

      // Verify animation
      const baseVs = pageViewCtx
        .variantTplMgr()
        .ensureBaseVariantSetting(pastedTpl);

      expect(baseVs.rs.animations).toMatchObject([
        {
          sequence: {
            name: "fadeIn",
          },
          timingFunction: "linear",
          duration: "1s",
          delay: "0s",
          iterationCount: "infinite",
          fillMode: "none",
          direction: "alternate-reverse",
          playState: "running",
        },
      ]);

      const hoverVs = pastedTpl.vsettings.find((vs) =>
        vs.variants.find((v) => v.selectors?.includes(":hover")),
      );
      assert(hoverVs, "Expected Hover VariantSetting to exists, found null");
      expect(hoverVs.rs.animations).toMatchObject([]);

      expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
    });

    it("pastes multiple siblings directly without body wrapper", async () => {
      const htmlStr = `<h1>First</h1><h2>Second</h2>`;
      const clipboard = htmlToClipboard(htmlStr);
      pageViewCtx.selectNewTpl(page.tplTree);
      await paste({ clipboard, studioCtx, cursorClientPt: undefined });

      const rootChildren = Tpls.tplChildren(page.tplTree);
      expect(rootChildren).toHaveLength(2);
      expect(Tpls.getTagOrComponentName(rootChildren[0])).toEqual("h1");
      expect(Tpls.getTagOrComponentName(rootChildren[1])).toEqual("h2");
    });
  });
});
