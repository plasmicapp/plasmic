import { ReadableClipboard } from "@/wab/client/clipboard/ReadableClipboard";
import {
  pngData,
  svgData,
} from "@/wab/client/clipboard/__testonly__/clipboard-test-data";
import { PLASMIC_CLIPBOARD_FORMAT } from "@/wab/client/clipboard/common";

describe("ReadableClipboard", () => {
  it("handles Plasmic clipboard format", async () => {
    const clipboard = ReadableClipboard.fromData({
      [PLASMIC_CLIPBOARD_FORMAT]: '{"action":"copy"}',
    });
    expect(clipboard.getPlasmicData()).toEqual({ action: "copy" });
    expect(clipboard.getText()).toEqual(null);
    expect(await clipboard.getImage()).toEqual(null);
  });

  it("handles plain text", async () => {
    const clipboard = ReadableClipboard.fromData({
      "text/plain": "plain text",
    });
    expect(clipboard.getPlasmicData()).toEqual(null);
    expect(clipboard.getText()).toEqual("plain text");
    expect(await clipboard.getImage()).toEqual(null);
  });

  it("handles SVG image in plain text", async () => {
    const { xml, dataUri, clipboardData, height, width } = svgData();
    const clipboard = ReadableClipboard.fromData(clipboardData);
    expect(clipboard.getPlasmicData()).toEqual(null);
    expect(clipboard.getText()).toEqual(xml);
    const image = await clipboard.getImage();
    expect(image?.url).toEqual(dataUri);
    expect(image?.height).toEqual(height);
    expect(image?.width).toEqual(width);
  });

  it("handles text SVG data with missing xmlns", async () => {
    const { dataUri, height, width } = svgData();
    const xmlMissingXmlns =
      '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" /></svg>';
    const clipboard = ReadableClipboard.fromData({
      "text/plain": xmlMissingXmlns,
    });
    expect(clipboard.getPlasmicData()).toEqual(null);
    expect(clipboard.getText()).toEqual(xmlMissingXmlns);
    const image = await clipboard.getImage();
    expect(image?.url).toEqual(dataUri);
    expect(image?.height).toEqual(height);
    expect(image?.width).toEqual(width);
  });

  it("handles image data", async () => {
    const { dataUri, clipboardData, height, width } = pngData();
    const clipboard = ReadableClipboard.fromData(clipboardData);
    expect(clipboard.getPlasmicData()).toEqual(null);
    expect(clipboard.getText()).toEqual(null);
    const image = await clipboard.getImage();
    expect(image?.height).toEqual(height);
    expect(image?.width).toEqual(width);
    expect(image?.url).toEqual(dataUri);
  });

  describe("fromDataTransfer", () => {
    it("works", async () => {
      const { dataUri, clipboardData, height, width } = pngData();
      // @ts-expect-error - for testing
      const dataTransfer: DataTransfer = {
        // @ts-expect-error - for testing
        items: [
          {
            kind: "string",
            type: "text/plain",
          },
          {
            kind: "string",
            type: "text/html",
          },
          {
            kind: "file",
            type: "image/png",
            getAsFile(): File | null {
              return clipboardData["image/png"];
            },
          },
        ] as DataTransferItemList,
        getData(format: string): string {
          if (format === "text/plain") {
            return "plain text";
          } else if (format === "text/html") {
            return clipboardData["text/html"];
          } else {
            return "";
          }
        },
      };

      const clipboard = ReadableClipboard.fromDataTransfer(dataTransfer);
      expect(clipboard.getPlasmicData()).toEqual(null);
      expect(clipboard.getText()).toEqual("plain text");
      const image = await clipboard.getImage();
      expect(image?.height).toEqual(height);
      expect(image?.width).toEqual(width);
      expect(image?.url).toEqual(dataUri);
    });
  });
});
