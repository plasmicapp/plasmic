import { shouldUseLegacyBehavior } from "@/wab/shared/codegen/react-p/utils";

describe("shouldUseLegacyBehavior", () => {
  it("returns true (legacy for backwards compatibility) when no platformVersion is set", () => {
    expect(shouldUseLegacyBehavior(undefined)).toBe(true);
    expect(shouldUseLegacyBehavior("")).toBe(true);
  });

  it("returns true (legacy) for Next.js < 13", () => {
    expect(shouldUseLegacyBehavior("12.3.4")).toBe(true);
    expect(shouldUseLegacyBehavior("^12.0.0")).toBe(true);
    expect(shouldUseLegacyBehavior("~11.1.0")).toBe(true);
  });

  it("returns false (modern) for Next.js >= 13", () => {
    expect(shouldUseLegacyBehavior("13.0.0")).toBe(false);
    expect(shouldUseLegacyBehavior("^13.4.0")).toBe(false);
    expect(shouldUseLegacyBehavior("14.2.3")).toBe(false);
    expect(shouldUseLegacyBehavior("^14.0.0")).toBe(false);
    expect(shouldUseLegacyBehavior("15.0.0-canary.1")).toBe(false);
  });

  it("returns false (modern) for non-semver values like 'latest' or '*'", () => {
    expect(shouldUseLegacyBehavior("latest")).toBe(false);
    expect(shouldUseLegacyBehavior("*")).toBe(false);
    expect(shouldUseLegacyBehavior("canary")).toBe(false);
  });
});
