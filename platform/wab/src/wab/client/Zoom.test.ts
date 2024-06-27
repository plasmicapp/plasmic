import { zoomJump } from "@/wab/client/Zoom";
import { tuple } from "@/wab/shared/common";

describe("zoomJump", () => {
  it("works on whole zooms", () => {
    const tests = [
      tuple(1, 1, 2),
      tuple(2, 1, 4),
      tuple(0.5, 1, 1),
      tuple(1, -1, 0.5),
      tuple(0.5, -1, 0.25),
      tuple(2, -1, 1),
    ];
    for (const [init, inc, res] of tests) {
      expect(zoomJump(init, inc as 1 | -1)).toBe(res);
    }
  });
  it("works on partial zooms", () => {
    const tests = [
      tuple(0.7, 1, 1),
      tuple(0.71, 1, 2),
      tuple(0.7, -1, 0.25),
      tuple(0.71, -1, 0.5),
    ];
    for (const [init, inc, res] of tests) {
      expect(zoomJump(init, inc as 1 | -1)).toBe(res);
    }
  });
});
