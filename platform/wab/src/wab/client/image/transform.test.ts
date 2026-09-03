import { reduceImageSize } from "@/wab/client/image/transform";

describe("reduceImageSize", () => {
  it("should reduce the width to fit within the maxWidth while maintaining aspect ratio", () => {
    const result = reduceImageSize(2000, 1000, 1000, 1000);
    expect(result).toEqual({ width: 1000, height: 500 });
  });

  it("should reduce the height to fit within the maxHeight while maintaining aspect ratio", () => {
    const result = reduceImageSize(1000, 2000, 1000, 1000);
    expect(result).toEqual({ width: 500, height: 1000 });
  });

  it("should reduce both width and height to fit within maxWidth and maxHeight while maintaining aspect ratio", () => {
    const result = reduceImageSize(4000, 2000, 1000, 500);
    expect(result).toEqual({ width: 1000, height: 500 });
  });

  it("should not change the size if it is within the maxWidth and maxHeight", () => {
    const result = reduceImageSize(800, 600, 1000, 1000);
    expect(result).toEqual({ width: 800, height: 600 });
  });
});
