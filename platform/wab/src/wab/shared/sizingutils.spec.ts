import { getViewportAwareHeight } from "@/wab/shared/sizingutils";

describe("getViewportAwareHeight", () => {
  it("should wrap simple vh value in calc", () => {
    const result = getViewportAwareHeight("50vh");
    expect(result).toBe("calc(var(--viewport-height) * 50 / 100)");
  });

  it("should wrap vh in calc even when already inside calc (nested calc)", () => {
    const result = getViewportAwareHeight("calc(100vh - 20px)");
    expect(result).toBe(
      "calc(calc(var(--viewport-height) * 100 / 100) - 20px)"
    );
  });

  it("should wrap vh in calc even when inside min (nested calc)", () => {
    const result = getViewportAwareHeight("min(100vh, 500px)");
    expect(result).toBe("min(calc(var(--viewport-height) * 100 / 100),500px)");
  });

  it("should wrap vh in calc even when inside max (nested calc)", () => {
    const result = getViewportAwareHeight("max(50vh, 200px)");
    expect(result).toBe("max(calc(var(--viewport-height) * 50 / 100),200px)");
  });

  it("should wrap vh in calc even when inside clamp (nested calc)", () => {
    const result = getViewportAwareHeight("clamp(20vh, 50vh, 80vh)");
    expect(result).toBe(
      "clamp(calc(var(--viewport-height) * 20 / 100),calc(var(--viewport-height) * 50 / 100),calc(var(--viewport-height) * 80 / 100))"
    );
  });

  it("should handle multiple vh values with nested calcs", () => {
    const result = getViewportAwareHeight("calc(100vh - 50vh)");
    expect(result).toBe(
      "calc(calc(var(--viewport-height) * 100 / 100) - calc(var(--viewport-height) * 50 / 100))"
    );
  });

  it("should return unchanged value when no vh present", () => {
    const result = getViewportAwareHeight("100px");
    expect(result).toBe("100px");
  });

  it("should return unchanged value when no vh present in function", () => {
    const result = getViewportAwareHeight("calc(100% - 20px)");
    expect(result).toBe("calc(100% - 20px)");
  });

  it("should handle decimal vh values with division in CSS", () => {
    const result = getViewportAwareHeight("33.33vh");
    expect(result).toBe("calc(var(--viewport-height) * 33.33 / 100)");
  });

  it("should handle complex nested calc expressions", () => {
    const result = getViewportAwareHeight("calc(100vh - 10vh - 20px)");
    expect(result).toBe(
      "calc(calc(var(--viewport-height) * 100 / 100) - calc(var(--viewport-height) * 10 / 100) - 20px)"
    );
  });

  it("should handle calc inside max with nested calcs", () => {
    const result = getViewportAwareHeight("max(calc(100vh - 50px), 300px)");
    expect(result).toBe(
      "max(calc(calc(var(--viewport-height) * 100 / 100) - 50px),300px)"
    );
  });

  it("should handle calc inside clamp with nested calcs", () => {
    const result = getViewportAwareHeight(
      "clamp(10vh, calc(50vh + 100px), 90vh)"
    );
    expect(result).toBe(
      "clamp(calc(var(--viewport-height) * 10 / 100),calc(calc(var(--viewport-height) * 50 / 100) + 100px),calc(var(--viewport-height) * 90 / 100))"
    );
  });

  it("should handle min with multiple vh values and nested calcs", () => {
    const result = getViewportAwareHeight("min(100vh, 50vh + 200px)");
    expect(result).toBe(
      "min(calc(var(--viewport-height) * 100 / 100),calc(var(--viewport-height) * 50 / 100) + 200px)"
    );
  });
});
