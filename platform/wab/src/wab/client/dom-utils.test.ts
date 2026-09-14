import {
  deriveImageAssetTypeAndUri,
  isDescendant,
  isWithinKeyboardInteractiveElement,
  isWithinPointerInteractiveElement,
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

describe("isDescendant", () => {
  it("works", () => {
    const root = document.createElement("div");
    const a = root.appendChild(document.createElement("div"));
    const aa = a.appendChild(document.createElement("div"));
    const b = root.appendChild(document.createElement("div"));

    expect(isDescendant({ parent: root, child: a })).toBe(true);
    expect(isDescendant({ parent: root, child: aa })).toBe(true);
    expect(isDescendant({ parent: root, child: b })).toBe(true);
    expect(isDescendant({ parent: a, child: aa })).toBe(true);

    expect(isDescendant({ parent: root, child: root })).toBe(false);
    expect(isDescendant({ parent: a, child: root })).toBe(false);
    expect(isDescendant({ parent: aa, child: root })).toBe(false);
    expect(isDescendant({ parent: aa, child: a })).toBe(false);
    expect(isDescendant({ parent: b, child: root })).toBe(false);
    expect(isDescendant({ parent: a, child: b })).toBe(false);
    expect(isDescendant({ parent: b, child: a })).toBe(false);
  });

  // prettier-ignore
  it("works cross frame", () => {
    // Iframes only get a contentDocument once connected to a document.
    const root = document.body.appendChild(document.createElement('div'));
    const f = root.appendChild(document.createElement('iframe'));
    const fa = f.contentDocument!.body.appendChild(document.createElement("div"));
    const ff = f.contentDocument!.body.appendChild(document.createElement("iframe"));
    const ffa = ff.contentDocument!.body.appendChild(document.createElement("div"));
    const faf = fa.appendChild(document.createElement("iframe"));
    const fafa = faf.contentDocument!.body.appendChild(document.createElement("div"));

    expect(isDescendant({ parent: root, child: root })).toBe(false);
    expect(isDescendant({ parent: root, child: root, crossFrame: true })).toBe(false);

    expect(isDescendant({ parent: root, child: f })).toBe(true);
    expect(isDescendant({ parent: root, child: f, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: root, child: fa })).toBe(false);
    expect(isDescendant({ parent: root, child: fa, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: root, child: ff })).toBe(false);
    expect(isDescendant({ parent: root, child: ff, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: root, child: ffa })).toBe(false);
    expect(isDescendant({ parent: root, child: ffa, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: root, child: faf })).toBe(false);
    expect(isDescendant({ parent: root, child: faf, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: root, child: fafa })).toBe(false);
    expect(isDescendant({ parent: root, child: fafa, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: f, child: fa })).toBe(false);
    expect(isDescendant({ parent: f, child: fa, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: f, child: ff })).toBe(false);
    expect(isDescendant({ parent: f, child: ff, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: f, child: ffa })).toBe(false);
    expect(isDescendant({ parent: f, child: ffa, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: f, child: faf })).toBe(false);
    expect(isDescendant({ parent: f, child: faf, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: f, child: fafa })).toBe(false);
    expect(isDescendant({ parent: f, child: fafa, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: fa, child: faf })).toBe(true);
    expect(isDescendant({ parent: fa, child: faf, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: fa, child: fafa })).toBe(false);
    expect(isDescendant({ parent: fa, child: fafa, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: ff, child: ffa })).toBe(false);
    expect(isDescendant({ parent: ff, child: ffa, crossFrame: true })).toBe(true);

    expect(isDescendant({ parent: faf, child: fafa })).toBe(false);
    expect(isDescendant({ parent: faf, child: fafa, crossFrame: true })).toBe(true);

    root.remove();
  });
});

describe("isWithinKeyboardInteractiveElement/isWithinPointerInteractiveElement", () => {
  /** Checks the element with id="target", or the first element. */
  function check(
    html: string,
    expected: { pointer: boolean; keyboard: boolean }
  ): void {
    const container = document.createElement("div");
    container.innerHTML = html;
    const target =
      container.querySelector("#target") ?? container.firstElementChild!;
    expect({
      html,
      pointer: isWithinPointerInteractiveElement(target),
      keyboard: isWithinKeyboardInteractiveElement(target),
    }).toEqual({ html, ...expected });
  }

  it("matches text-editable elements and their descendants for both", () => {
    const both = { pointer: true, keyboard: true };
    check(`<input />`, both); // type defaults to text
    check(`<input type="text" />`, both);
    check(`<input type="email" />`, both);
    check(`<input type="number" />`, both);
    check(`<textarea></textarea>`, both);
    check(`<div contenteditable></div>`, both);
    check(`<div contenteditable><p id="target"></p></div>`, both);
    check(`<div contenteditable="true"></div>`, both);
    check(`<div contenteditable="true"><p id="target"></p></div>`, both);
  });

  it("matches non-text controls for pointer only", () => {
    const pointerOnly = { pointer: true, keyboard: false };
    check(`<input type="button" />`, pointerOnly);
    check(`<input type="submit" />`, pointerOnly);
    check(`<input type="radio" />`, pointerOnly);
    check(`<input type="checkbox" />`, pointerOnly);
    check(`<input type="invalid-type" />`, pointerOnly);
    check(`<button></button>`, pointerOnly);
    check(`<button><span id="target"></span></button>`, pointerOnly);
    check(`<select></select>`, pointerOnly);
    check(`<a href="#"></a>`, pointerOnly);
    check(`<div role="button"></div>`, pointerOnly);
  });

  it("matches non-interactive elements for neither", () => {
    const neither = { pointer: false, keyboard: false };
    check(`<div></div>`, neither);
    check(`<div><p id="target"></p></div>`, neither);
    check(`<div contenteditable="false"></div>`, neither);
    check(
      `<div contenteditable="false"><span id="target"></span></div>`,
      neither
    );
    check(`<p id="target"></p> <input />`, neither);
  });
});
