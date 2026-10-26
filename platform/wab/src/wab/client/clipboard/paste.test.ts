import { fakeStudioCtx } from "@/wab/client/__testonly__/fake-init-ctx";
import { ReadableClipboard } from "@/wab/client/clipboard/ReadableClipboard";
import {
  pngData,
  svgData,
} from "@/wab/client/clipboard/__testonly__/clipboard-test-data";
import { PLASMIC_CLIPBOARD_FORMAT } from "@/wab/client/clipboard/common";
import { paste } from "@/wab/client/clipboard/paste";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import * as Variants from "@/wab/shared/Variants";
import { ComponentType } from "@/wab/shared/core/components";
import * as ImageAssets from "@/wab/shared/core/image-assets";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplImageTag } from "@/wab/shared/core/tpls";
import { DevFlagsType } from "@/wab/shared/devflags";
import { Component } from "@/wab/shared/model/classes";

let studioCtx: StudioCtx;
let api: ReturnType<typeof fakeStudioCtx>["api"];
let page: Component;
let pageViewCtx: ViewCtx;

function setUp(devFlagOverrides?: Partial<DevFlagsType>) {
  const studioCtxDeps = fakeStudioCtx({ devFlagOverrides });
  studioCtx = studioCtxDeps.studioCtx;
  api = studioCtxDeps.api;

  page = studioCtx.addComponent("Page", {
    type: ComponentType.Page,
  });
  pageViewCtx = studioCtx.focusedViewCtx()!;
}

/** Pastes the 5x5 PNG fixture and returns the asset of the pasted picture. */
async function pastePng() {
  pageViewCtx.selectNewTpl(page.tplTree);
  const { dataUri, clipboardData, height, width } = pngData();
  api.uploadImageFile.mockResolvedValue({ dataUri, height, width });

  expect(
    await paste({
      clipboard: ReadableClipboard.fromData(clipboardData),
      studioCtx,
      cursorClientPt: undefined,
    }),
  ).toBe(true);
  const [pastedTpl] = Tpls.tplChildren(page.tplTree);
  return ImageAssets.getOnlyAssetRef(pastedTpl as TplImageTag);
}

describe("paste", () => {
  beforeEach(() => setUp());

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
      }),
    ).toBe(true);
    const rootChildren = Tpls.tplChildren(page.tplTree);
    expect(rootChildren).toHaveLength(1);
    const pastedTpl = rootChildren[0];
    expect(Tpls.getTplTextBlockContent(pastedTpl, pageViewCtx)).toEqual(
      "Hello, world!",
    );
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
  });

  it("pastes SVG image in plain text as tpl icon", async () => {
    pageViewCtx.selectNewTpl(page.tplTree);
    const { processedDataUri, clipboardData } = svgData();
    const clipboard = ReadableClipboard.fromData(clipboardData);

    expect(
      await paste({
        clipboard,
        studioCtx,
        cursorClientPt: undefined,
      }),
    ).toBe(true);
    const rootChildren = Tpls.tplChildren(page.tplTree);
    expect(rootChildren).toHaveLength(1);
    const pastedTpl = rootChildren[0];
    expect(Tpls.isTplIcon(pastedTpl)).toBe(true);
    expect(
      ImageAssets.getOnlyAssetRef(pastedTpl as TplImageTag)?.dataUri,
    ).toEqual(processedDataUri);
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
      }),
    ).toBe(true);
    const rootChildren = Tpls.tplChildren(page.tplTree);
    expect(rootChildren).toHaveLength(1);
    const pastedTpl = rootChildren[0];
    expect(Tpls.isTplPicture(pastedTpl)).toBe(true);
    expect(
      ImageAssets.getOnlyAssetRef(pastedTpl as TplImageTag)?.dataUri,
    ).toEqual(dataUri);
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl]);
    expect(api.describeImage).not.toHaveBeenCalled();
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
      }),
    ).toBe(true);
    const rootChildren = Tpls.tplChildren(page.tplTree);
    expect(rootChildren).toHaveLength(2);
    const pastedTpl = rootChildren[1];
    expect(Tpls.getTplTextBlockContent(pastedTpl, pageViewCtx)).toEqual(
      "Copy me",
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
      }),
    ).toBe(true);
    const rootChildren = Tpls.tplChildren(page.tplTree);
    expect(rootChildren).toHaveLength(2);
    const pastedTpl = rootChildren[1];
    expect(Tpls.getTagOrComponentName(pastedTpl)).toEqual("div");
    const pastedTplChildren = Tpls.tplChildren(pastedTpl);
    expect(pastedTplChildren).toHaveLength(1);
    expect(
      Tpls.getTplTextBlockContent(pastedTplChildren[0], pageViewCtx),
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
      }),
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
      }),
    ).toBe(true);
    expect(Tpls.tplChildren(dstDiv)).toHaveLength(2);
    const pastedTpl2 = Tpls.tplChildren(dstDiv)[1];
    expect(Tpls.getTagOrComponentName(pastedTpl2)).toEqual("div");
    expect(pageViewCtx.focusedTpls()).toEqual([pastedTpl2]);
  });
});

describe("paste with image descriptions on", () => {
  beforeEach(() => setUp({ enableImageDescriptions: true }));

  it("stores the description on the pasted picture's asset", async () => {
    api.describeImage.mockResolvedValue({ description: "A small red dot." });

    const asset = await pastePng();

    expect(asset?.description).toBe("A small red dot.");
  });

  it("pastes the picture without a description when describing fails", async () => {
    api.describeImage.mockRejectedValue(new Error("Too many requests"));

    const asset = await pastePng();

    expect(asset?.dataUri).toBe(pngData().dataUri);
    expect(asset?.description).toBeNull();
  });
});
