import { matchOrder } from "@/wab/collections";

describe("matchOrder", () => {
  it("should work", () => {
    let xs = ["4", "3", "1", "."].map((k) => ({ k, g: 0 }));
    let ys = ["3", ".", "1", "4"].map((k) => ({ k, g: 1 }));
    let expected = ["3", ".", "1", "4"].map((k) => ({ k, g: 0 }));
    expect(matchOrder(xs, ys, (x) => x.k)).toEqual(expected);
  });
});
