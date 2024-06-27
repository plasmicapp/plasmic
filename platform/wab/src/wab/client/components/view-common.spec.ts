import { renderStyles } from "@/wab/client/components/view-common";
import { cx, tuple } from "@/wab/shared/common";

describe("cx", () =>
  it("should work", function () {
    expect(cx(tuple("a", "b"))).toBe("a b");
    return expect(cx({ a: false, b: true })).toBe("b");
  }));

describe("renderStyles", () => {
  it("works", () => {
    const x = renderStyles({
      boxShadow: "none",
      borderBottom: "1px solid gray !important",
    });
    expect(x).toBe("box-shadow:none;border-bottom:1px solid gray !important");
  });
});
