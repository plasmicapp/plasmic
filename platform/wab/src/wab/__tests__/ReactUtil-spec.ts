import { cx } from "../common";
import { combineProps } from "../commons/components/ReactUtil";

describe("combineProps", () =>
  it("should work", function () {
    let aProps, bProps;
    const combined = combineProps(
      (aProps = {
        onChange: jest.fn(),
        className: "a",
      }),
      (bProps = {
        onChange: jest.fn(),
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
