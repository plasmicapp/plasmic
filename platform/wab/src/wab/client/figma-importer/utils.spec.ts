import { rgbToString } from "@/wab/client/figma-importer/utils";

describe("Figma importer utils", () => {
  describe("rgbToString", () => {
    it("should convert common fractions properly", () => {
      expect(rgbToString({ r: 0, g: 0, b: 0 })).toBe("rgba(0, 0, 0, 1)");
      expect(rgbToString({ r: 0.5, g: 0.5, b: 0.5 })).toBe(
        "rgba(128, 128, 128, 1)"
      );
      expect(rgbToString({ r: 0.9999, g: 0.9999, b: 0.9999 })).toBe(
        "rgba(255, 255, 255, 1)"
      );
      expect(rgbToString({ r: 0.499, g: 0.499, b: 0.499 })).toBe(
        "rgba(127, 127, 127, 1)"
      );
      expect(rgbToString({ r: 0.501, g: 0.501, b: 0.501 })).toBe(
        "rgba(128, 128, 128, 1)"
      );
    });

    it("should properly round numbers with at least 3 digits of precision", () => {
      for (let i = 0; i <= 255; i++) {
        // Convert it to a percentage
        const percent = i / 255;
        // Round it to 3 digits
        const percentFixed3 = +percent.toFixed(3);
        // Introduce small error to the number in the 3rd decimal place
        const percentFixed3Minus1 = +(percent - 0.001).toFixed(3);
        const percentFixed3Plus1 = +(percent + 0.001).toFixed(3);

        // The error is smaller then 1/255, so the values should be the same when converted to 0-255
        expect(
          rgbToString({
            r: percentFixed3,
            g: percentFixed3Minus1,
            b: percentFixed3Plus1,
          })
        ).toEqual(`rgba(${i}, ${i}, ${i}, 1)`);
      }
    });
  });
});
