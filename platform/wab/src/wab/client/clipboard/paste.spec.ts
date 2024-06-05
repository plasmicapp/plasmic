import { Component } from "@/wab/classes";
import { PLASMIC_CLIPBOARD_FORMAT } from "@/wab/client/clipboard/common";
import { paste } from "@/wab/client/clipboard/paste";
import { ReadableClipboard } from "@/wab/client/clipboard/ReadableClipboard";
import {
  pngData,
  svgData,
} from "@/wab/client/clipboard/test/clipboard-test-data";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { ComponentType } from "@/wab/components";
import * as ImageAssets from "@/wab/image-assets";
import * as Variants from "@/wab/shared/Variants";
import * as Tpls from "@/wab/tpls";
import { TplImageTag } from "@/wab/tpls";

let studioCtx: StudioCtx;
let api: ReturnType<typeof fakeStudioCtx>["api"];
let page: Component;
let pageViewCtx: ViewCtx;

describe("paste", () => {
  beforeEach(() => {
    const studioCtxDeps = fakeStudioCtx();
    studioCtx = studioCtxDeps.studioCtx;
    api = studioCtxDeps.api;

    page = studioCtx.addComponent("Page", {
      type: ComponentType.Page,
    });
    pageViewCtx = studioCtx.focusedViewCtx()!;
  });

  it("pastes plain text as a tpl text", async () => {
    pageViewCtx.selectNewTpl(page.tplTree);
    const clipboard = ReadableClipboard.fromData({
      "text/plain": "Hello, world!",
    });

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
    expect(Tpls.getTplTextBlockContent(pastedTpl, pageViewCtx)).toEqual(
      "Hello, world!"
    );
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
  });

  it("pastes SVG image in plain text as tpl icon", async () => {
    pageViewCtx.selectNewTpl(page.tplTree);
    const { dataUri, clipboardData } = svgData();
    const clipboard = ReadableClipboard.fromData(clipboardData);

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
    expect(Tpls.isTplIcon(pastedTpl)).toBe(true);
    expect(
      ImageAssets.getOnlyAssetRef(pastedTpl as TplImageTag)?.dataUri
    ).toEqual(dataUri);
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
  });

  it("pastes PNG image as tpl picture", async () => {
    pageViewCtx.selectNewTpl(page.tplTree);
    const { dataUri, clipboardData, height, width } = pngData();
    const clipboard = ReadableClipboard.fromData(clipboardData);
    api.uploadImageFile.mockImplementation(async (req) => {
      req.imageFile;
      return {
        dataUri,
        height,
        width,
      };
    });

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
    expect(Tpls.isTplPicture(pastedTpl)).toBe(true);
    expect(
      ImageAssets.getOnlyAssetRef(pastedTpl as TplImageTag)?.dataUri
    ).toEqual(dataUri);
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
  });

  it("pastes a single tpl", async () => {
    const copyMeText = Tpls.mkTplInlinedText("Copy me", [
      Variants.getBaseVariant(page),
    ]);
    pageViewCtx.viewOps.insertAsChild(copyMeText, page.tplTree);
    pageViewCtx.selectNewTpl(copyMeText);
    pageViewCtx.viewOps.copy();
    const clipboard = ReadableClipboard.fromData({
      [PLASMIC_CLIPBOARD_FORMAT]: '{"action":"copy"}',
    });

    expect(
      await paste({
        clipboard,
        studioCtx,
        cursorClientPt: undefined,
      })
    ).toBe(true);
    const rootChildren = Tpls.tplChildren(page.tplTree);
    expect(rootChildren).toHaveLength(2);
    const pastedTpl = rootChildren[1];
    expect(Tpls.getTplTextBlockContent(pastedTpl, pageViewCtx)).toEqual(
      "Copy me"
    );
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
  });

  it("pastes a tpl tree", async () => {
    const copyMeText = Tpls.mkTplInlinedText("Copy me", [
      Variants.getBaseVariant(page),
    ]);
    pageViewCtx.viewOps.insertAsChild(copyMeText, page.tplTree);
    pageViewCtx.selectNewTpl(page.tplTree);
    pageViewCtx.viewOps.copy();
    const clipboard = ReadableClipboard.fromData({
      [PLASMIC_CLIPBOARD_FORMAT]: '{"action":"copy"}',
    });

    expect(
      await paste({
        clipboard,
        studioCtx,
        cursorClientPt: undefined,
      })
    ).toBe(true);
    const rootChildren = Tpls.tplChildren(page.tplTree);
    expect(rootChildren).toHaveLength(2);
    const pastedTpl = rootChildren[1];
    expect(Tpls.getTagOrComponentName(pastedTpl)).toEqual("div");
    const pastedTplChildren = Tpls.tplChildren(pastedTpl);
    expect(pastedTplChildren).toHaveLength(1);
    expect(
      Tpls.getTplTextBlockContent(pastedTplChildren[0], pageViewCtx)
    ).toEqual("Copy me");
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
  });

  it("pastes a container multiple times without nesting", async () => {
    const srcDiv = Tpls.mkTplTagSimple("div");
    const dstDiv = Tpls.mkTplTagSimple("div");
    pageViewCtx.viewOps.insertAsChild(srcDiv, page.tplTree);
    pageViewCtx.viewOps.insertAsChild(dstDiv, page.tplTree);
    pageViewCtx.selectNewTpl(srcDiv);
    pageViewCtx.viewOps.copy();
    const clipboard = ReadableClipboard.fromData({
      [PLASMIC_CLIPBOARD_FORMAT]: '{"action":"copy"}',
    });

    // First paste in dstDiv
    pageViewCtx.selectNewTpl(dstDiv);
    expect(
      await paste({
        clipboard,
        studioCtx,
        cursorClientPt: undefined,
      })
    ).toBe(true);
    expect(Tpls.tplChildren(dstDiv)).toHaveLength(1);
    const pastedTpl = Tpls.tplChildren(dstDiv)[0];
    expect(Tpls.getTagOrComponentName(pastedTpl)).toEqual("div");
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);

    // Copy of srcDiv is now focused
    // Second paste should still paste in dstDiv even though srcDiv is focused
    expect(
      await paste({
        clipboard,
        studioCtx,
        cursorClientPt: undefined,
      })
    ).toBe(true);
    expect(Tpls.tplChildren(dstDiv)).toHaveLength(2);
    const pastedTpl2 = Tpls.tplChildren(dstDiv)[1];
    expect(Tpls.getTagOrComponentName(pastedTpl2)).toEqual("div");
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl2]);
  });
});
