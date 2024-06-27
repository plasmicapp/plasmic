import { Box, findSpaceForRectSweepRight, mergeSpans, Pt } from "@/wab/shared/geom";

describe("Box", () => {
  describe("adjustSides", () => {
    it("works", () => {
      expect(
        new Box(0, 0, 10, 10)
          .adjustSides({
            left: 1,
            bottom: 100,
          })
          .rect()
      ).toMatchObject({
        top: 0,
        left: 1,
        height: 110,
        width: 9,
      });
    });
  });
  describe("intersection", () => {
    expect(new Box(0, 0, 1, 1).intersection(new Box(1, 0, 1, 1))).toBe(
      undefined
    );
  });
});

describe("mergeSpans", () => {
  it("works", () => {
    expect(
      mergeSpans([
        [0, 10],
        [5, 6],
        [7, 12],
        [15, 18],
        [14, 15],
      ])
    ).toEqual([
      [0, 12],
      [14, 18],
    ]);
  });
});

describe("findSpaceForRectSweepRight", () => {
  it("works", () => {
    expect(
      findSpaceForRectSweepRight(10, 10, new Pt(5, 5), [
        // Insert after these
        { top: 0, left: 0, width: 1, height: 1 },
        { top: 9, left: 9, width: 1, height: 1 },
        // Insert before here
        { top: 5, left: 21, width: 1, height: 1 },
        // Doesn't intersect
        { top: 10, left: 10, width: 1, height: 1 },
      ])
    ).toEqual({ top: 0, left: 10 });
  });
});
