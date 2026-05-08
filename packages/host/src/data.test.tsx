// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { renderToString } from "react-dom/server.node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataCtxReader, PageParamsProvider } from "./data";

function formatQueryValue(value: string | string[]) {
  return Array.isArray(value) ? value.join(",") : value;
}

function QueryReader({ name }: { name: string }) {
  return (
    <DataCtxReader>
      {($ctx) => (
        <div data-testid={name}>
          {formatQueryValue($ctx?.query?.[name] ?? "")}
        </div>
      )}
    </DataCtxReader>
  );
}

function queryText(name: string) {
  return screen.getByTestId(name).textContent;
}

describe("PageParamsProvider query params", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(cleanup);

  it("provides query params from props during server rendering", () => {
    const html = renderToString(
      <PageParamsProvider query={{ test: "from-props", multi: ["a", "b"] }}>
        <QueryReader name="test" />
        <QueryReader name="multi" />
      </PageParamsProvider>
    );

    expect(html).toContain("from-props");
    expect(html).toContain("a,b");
  });

  it("reads query params from the current browser location", () => {
    window.history.replaceState({}, "", "/page?test=Hello&multi=1&multi=2");

    render(
      <PageParamsProvider>
        <QueryReader name="test" />
        <QueryReader name="multi" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("Hello");
    expect(queryText("multi")).toBe("1,2");
  });

  it("uses query params from props during client rendering", () => {
    render(
      <PageParamsProvider query={{ test: "from-props", multi: ["a", "b"] }}>
        <QueryReader name="test" />
        <QueryReader name="multi" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("from-props");
    expect(queryText("multi")).toBe("a,b");
  });

  it("overrides prop query params with browser query params", () => {
    window.history.replaceState({}, "", "/page?test=from-browser");

    render(
      <PageParamsProvider query={{ test: "from-props", propOnly: "preserved" }}>
        <QueryReader name="test" />
        <QueryReader name="propOnly" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("from-browser");
    expect(queryText("propOnly")).toBe("preserved");
  });

  it("updates when browser history changes query params", () => {
    window.history.replaceState({}, "", "/page?test=initial");

    render(
      <PageParamsProvider>
        <QueryReader name="test" />
        <QueryReader name="multi" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("initial");

    act(() => {
      window.history.pushState({}, "", "/page?test=Hello&multi=1&multi=2");
    });
    expect(queryText("test")).toBe("Hello");
    expect(queryText("multi")).toBe("1,2");

    act(() => {
      window.history.replaceState({}, "", "/page?test=Goodbye");
    });
    expect(queryText("test")).toBe("Goodbye");
    expect(queryText("multi")).toBe("");
  });
});
