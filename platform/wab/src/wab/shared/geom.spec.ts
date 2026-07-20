import {
  Box,
  findSpaceForRectSweepRight,
  mergeSpans,
  Pt,
} from "@/wab/shared/geom";

describe("Pt", () => {
  describe("moveBy", () => {
    it("returns a moved point", () => {
      expect(new Pt(1, 2).moveBy(3, 4)).toEqual(new Pt(4, 6));
    });
    it("returns the same instance if unmoved", () => {
      const p = new Pt(1, 2);
      expect(p.moveBy(0, 0)).toBe(p);
    });
  });
});

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
  describe("clamp", () => {
    const box = new Box(0, 0, 5, 10);
    it("clamps points outside the box to the closest point within it", () => {
      expect(box.clamp(new Pt(-5, 5))).toEqual(new Pt(0, 5));
      expect(box.clamp(new Pt(3, 15))).toEqual(new Pt(3, 10));
      expect(box.clamp(new Pt(-5, 15))).toEqual(new Pt(0, 10));
      expect(box.clamp(new Pt(20, -20))).toEqual(new Pt(5, 0));
    });
    it("returns the same instance for points already within the box", () => {
      const inside = new Pt(3, 5);
      expect(box.clamp(inside)).toBe(inside);
      // edges/corners are inclusive
      [
        new Pt(0, 0),
        new Pt(0, 10),
        new Pt(5, 0),
        new Pt(5, 10),
        new Pt(0, 1),
        new Pt(4, 10),
      ].forEach((pt) => expect(box.clamp(pt)).toBe(pt));
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
