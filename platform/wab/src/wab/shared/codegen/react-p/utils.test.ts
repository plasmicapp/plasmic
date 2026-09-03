/** @vitest-environment node */

import {
  serializedKeyValue,
  serializedKeyValueForObject,
  shouldUseLegacyBehavior,
} from "@/wab/shared/codegen/react-p/utils";
import esbuild from "esbuild";

const compile = (loader: "ts" | "tsx", code: string) =>
  esbuild.transformSync(`declare const React: any;\n${code}`, {
    loader,
  }).code;

describe("serializedKeyValue", () => {
  it("compiles key with digit", () => {
    const serialized = serializedKeyValue("ok123", "456");
    expect(serialized).toEqual(`ok123={456}`);
    expect(compile("tsx", `const x = <div ${serialized} />;`)).toEqual(
      `const x = /* @__PURE__ */ React.createElement("div", { ok123: 456 });\n`
    );
  });
  it("compiles key with hyphen", () => {
    const serialized = serializedKeyValue("aria-label", `"My Label" as const`);
    expect(serialized).toEqual(`aria-label={"My Label" as const}`);
    expect(compile("tsx", `const x = <div ${serialized} />;`)).toEqual(
      `const x = /* @__PURE__ */ React.createElement("div", { "aria-label": "My Label" });\n`
    );
  });
  it("compiles key with plain characters", () => {
    const serialized = serializedKeyValue("onChange", "handler");
    expect(serialized).toEqual(`onChange={handler}`);
    expect(compile("tsx", `const x = <div ${serialized} />;`)).toEqual(
      `const x = /* @__PURE__ */ React.createElement("div", { onChange: handler });\n`
    );
  });
  it("compiles key with Cyrillic character", () => {
    // the C is actually \u0421
    const serialized = serializedKeyValue("onСhange", "handler");
    expect(serialized).toEqual(`{...{"on\\u0421hange": handler}}`);
    expect(compile("tsx", `const x = <div ${serialized} />;`)).toEqual(
      `const x = /* @__PURE__ */ React.createElement("div", { ...{ "on\\u0421hange": handler } });\n`
    );
  });
});

describe("serializedKeyValueForObject", () => {
  it("compiles key starting with digit", () => {
    const serialized = serializedKeyValueForObject("123", "456");
    expect(serialized).toEqual(`"123": 456`);
    expect(compile("ts", `const x = { ${serialized} };`)).toEqual(
      `const x = { "123": 456 };\n`
    );
  });
  it("compiles key with digit", () => {
    const serialized = serializedKeyValueForObject("ok123", "456");
    expect(serialized).toEqual(`ok123: 456`);
    expect(compile("ts", `const x = { ${serialized} };`)).toEqual(
      `const x = { ok123: 456 };\n`
    );
  });
  it("compiles key with hyphen", () => {
    const serialized = serializedKeyValueForObject(
      "aria-label",
      `"My Label" as const`
    );
    expect(serialized).toEqual(`"aria-label": "My Label" as const`);
    expect(compile("ts", `const x = { ${serialized} };`)).toEqual(
      `const x = { "aria-label": "My Label" };\n`
    );
  });
  it("compiles key with plain characters", () => {
    const serialized = serializedKeyValueForObject("onChange", "handler");
    expect(serialized).toEqual(`onChange: handler`);
    expect(compile("ts", `const x = { ${serialized} };`)).toEqual(
      `const x = { onChange: handler };\n`
    );
  });
  it("compiles key with Cyrillic character", () => {
    // the C is actually \u0421
    const serialized = serializedKeyValueForObject("onСhange", "handler");
    expect(serialized).toEqual(`"on\\u0421hange": handler`);
    expect(compile("ts", `const x = { ${serialized} };`)).toEqual(
      `const x = { "on\\u0421hange": handler };\n`
    );
  });
});

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
