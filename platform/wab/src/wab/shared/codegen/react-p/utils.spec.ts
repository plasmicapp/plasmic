/** @jest-environment node */

import {
  serializedKeyValue,
  serializedKeyValueForObject,
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
