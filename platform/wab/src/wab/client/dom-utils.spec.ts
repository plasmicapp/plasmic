import {
  deriveImageAssetTypeAndUri,
  ResizableImage,
} from "@/wab/client/dom-utils";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { parseDataUrl } from "@/wab/shared/data-urls";

function decodeDataUri(dataUri: string): string {
  const parsed = parseDataUrl(dataUri);
  if (!parsed) {
    throw new Error("Invalid data URI");
  }
  return atob(parsed.data);
}

describe("deriveImageAssetTypeAndUri", () => {
  describe("SVG handling", () => {
    it("converts SVG with no colors to icon with currentColor", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Icon);
      // Should have height="1em" and style="fill: currentColor;"
      const decodedSvg = decodeDataUri(result!.dataUri);
      expect(decodedSvg).toContain('height="1em"');
      expect(decodedSvg).toContain("fill: currentColor");
      expect(result?.iconColor).toBeUndefined(); // No explicit color
    });

    it("converts SVG with one color to icon with that color", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="#ff0000" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Icon);
      // Should have height="1em" and fill rewritten to currentColor
      const decodedSvg = decodeDataUri(result!.dataUri);
      expect(decodedSvg).toContain('height="1em"');
      expect(decodedSvg).toContain("currentColor");
      expect(result?.iconColor).toBe("#ff0000");
    });

    it("converts SVG with same (multi) color to icon with that color", () => {
      const svgXml =
        '<svg fill="#ff0000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="#ff0000" stroke="#ff0000" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Icon);
      // Should have height="1em" and fill rewritten to currentColor
      const decodedSvg = decodeDataUri(result!.dataUri);
      expect(decodedSvg).toContain('height="1em"');
      expect(decodedSvg).toContain("currentColor");
      expect(result?.iconColor).toBe("#ff0000");
    });

    it("converts SVG with currentColor to icon", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="currentColor" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Icon);
      // Should have height="1em"
      const decodedSvg = decodeDataUri(result!.dataUri);
      expect(decodedSvg).toContain('height="1em"');
      expect(decodedSvg).toContain("currentColor");
      expect(result?.iconColor).toBeUndefined(); // currentColor doesn't produce iconColor
    });

    it("converts SVG with no color(fill/stroke) and explicit color attribute to icon with that color", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" color="#ff0000" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="currentColor" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Icon);
      // Should have height="1em"
      const decodedSvg = decodeDataUri(result!.dataUri);
      expect(decodedSvg).toContain('height="1em"');
      expect(decodedSvg).toContain("currentColor");
      // When fill/stroke is currentColor, the color property value becomes iconColor
      expect(result?.iconColor).toBe("#ff0000");
    });

    it("converts SVG with currentColor and explicit color attribute to icon with that color", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" color="#ff0000" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="currentColor" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Icon);
      // Should have height="1em"
      const decodedSvg = decodeDataUri(result!.dataUri);
      expect(decodedSvg).toContain('height="1em"');
      expect(decodedSvg).toContain("currentColor");
      // When fill/stroke is currentColor, the color property value becomes iconColor
      expect(result?.iconColor).toBe("#ff0000");
    });

    it("converts SVG with currentColor and explicit color style to icon with that color", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" style="color: #00ff00" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="currentColor" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Icon);
      // Should have height="1em"
      const decodedSvg = decodeDataUri(result!.dataUri);
      expect(decodedSvg).toContain('height="1em"');
      expect(decodedSvg).toContain("currentColor");
      // When fill/stroke is currentColor, the color style value becomes iconColor
      expect(result?.iconColor).toBe("rgb(0, 255, 0)");
    });

    it("converts SVG to icon even when type is not specified", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="40" height="40" fill="#ff0000" /><rect x="50" y="50" width="40" height="40" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      // SVG with only one color is automatically treated as icon
      expect(result?.type).toBe(ImageAssetType.Icon);
      const decodedSvg = decodeDataUri(result!.dataUri);
      expect(decodedSvg).toContain('height="1em"');
      expect(decodedSvg).toContain("currentColor");
      expect(result?.iconColor).toBe("#ff0000");
    });

    it("converts SVG to picture if multi colored", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="40" height="40" fill="#ff0000" stroke="#0000ff" /><rect x="50" y="50" width="40" height="40" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      // SVG with multiple colors is automatically treated as picture
      expect(result?.type).toBe(ImageAssetType.Picture);
      expect(result?.dataUri).toBe(dataUri); // Should not be modified for pictures
    });

    it("converts SVG to picture when explicitly requested", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="#ff0000" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {
        type: ImageAssetType.Picture,
      });

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Picture);
      expect(result?.dataUri).toBe(dataUri); // Should not be modified
    });

    it("ignores SVG with url() color references when determining if it should be icon", () => {
      const svgXml =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad"><stop stop-color="#ff0000"/></linearGradient></defs><rect x="10" y="10" width="80" height="80" fill="url(#grad)" /></svg>';
      const dataUri = `data:image/svg+xml;base64,${btoa(svgXml)}`;
      const image = new ResizableImage(dataUri, 100, 100, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      // SVGs with url() references should be treated as pictures, not icons
      expect(result?.type).toBe(ImageAssetType.Picture);
    });
  });

  describe("Non-SVG handling", () => {
    it("converts PNG to picture when type is not specified", () => {
      // 5x5 red dot PNG
      const dataUri =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
      const image = new ResizableImage(dataUri, 5, 5, undefined);

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Picture);
      expect(result?.dataUri).toBe(dataUri); // Should not be modified
    });

    it("returns undefined when PNG is explicitly requested as icon", () => {
      const dataUri =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
      const image = new ResizableImage(dataUri, 5, 5, undefined);

      const result = deriveImageAssetTypeAndUri(image, {
        type: ImageAssetType.Icon,
      });

      // Should return undefined because non-SVG images cannot be icons
      expect(result).toBeUndefined();
    });

    it("converts PNG to picture when explicitly requested", () => {
      const dataUri =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
      const image = new ResizableImage(dataUri, 5, 5, undefined);

      const result = deriveImageAssetTypeAndUri(image, {
        type: ImageAssetType.Picture,
      });

      expect(result).toBeDefined();
      expect(result?.type).toBe(ImageAssetType.Picture);
      expect(result?.dataUri).toBe(dataUri); // Should not be modified
    });
  });

  describe("Error handling", () => {
    it("returns undefined for invalid data URI", () => {
      const image = new ResizableImage(
        "not-a-valid-data-uri",
        100,
        100,
        undefined
      );

      const result = deriveImageAssetTypeAndUri(image, {});

      expect(result).toBeUndefined();
    });
  });
});
