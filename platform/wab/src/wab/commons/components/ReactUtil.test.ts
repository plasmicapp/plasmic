import { combineProps } from "@/wab/commons/components/ReactUtil";
import { cx } from "@/wab/shared/common";

describe("combineProps", () =>
  it("should work", function () {
    let aProps, bProps;
    const combined = combineProps(
      (aProps = {
        onChange: vi.fn(),
        className: "a",
      }),
      (bProps = {
        onChange: vi.fn(),
        className: cx({
          b: true,
        }),
      })
    );
    expect(combined.className).toBe("a b");
    combined.onChange("foo");
    expect(aProps.onChange).toHaveBeenCalledWith("foo");
    return expect(bProps.onChange).toHaveBeenCalledWith("foo");
  }));
