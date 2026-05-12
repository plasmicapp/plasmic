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

  it("uses prop query params verbatim by default, ignoring the browser URL", () => {
    window.history.replaceState(
      {},
      "",
      "/page?test=from-browser&onlyBrowser=x"
    );

    render(
      <PageParamsProvider query={{ test: "from-props", propOnly: "kept" }}>
        <QueryReader name="test" />
        <QueryReader name="propOnly" />
        <QueryReader name="onlyBrowser" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("from-props");
    expect(queryText("propOnly")).toBe("kept");
    expect(queryText("onlyBrowser")).toBe("");
  });

  it("does not re-render on history changes when trackQueryParams is off", () => {
    window.history.replaceState({}, "", "/page?test=initial");

    render(
      <PageParamsProvider query={{ test: "from-props" }}>
        <QueryReader name="test" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("from-props");

    act(() => {
      window.history.pushState({}, "", "/page?test=changed");
    });
    expect(queryText("test")).toBe("from-props");
  });

  it("reads query params from the current browser location when trackQueryParams is on", () => {
    window.history.replaceState({}, "", "/page?test=Hello&multi=1&multi=2");

    render(
      <PageParamsProvider trackQueryParams>
        <QueryReader name="test" />
        <QueryReader name="multi" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("Hello");
    expect(queryText("multi")).toBe("1,2");
  });

  it("uses empty browser query params over prop query params during client rendering when trackQueryParams is on", () => {
    render(
      <PageParamsProvider
        trackQueryParams
        query={{ test: "from-props", multi: ["a", "b"] }}
      >
        <QueryReader name="test" />
        <QueryReader name="multi" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("");
    expect(queryText("multi")).toBe("");
  });

  it("uses browser query params as the source of truth when trackQueryParams is on, dropping prop-only keys", () => {
    window.history.replaceState({}, "", "/page?test=from-browser");

    render(
      <PageParamsProvider
        trackQueryParams
        query={{ test: "from-props", propOnly: "dropped" }}
      >
        <QueryReader name="test" />
        <QueryReader name="propOnly" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("from-browser");
    expect(queryText("propOnly")).toBe("");
  });

  it("updates when browser history changes query params and trackQueryParams is on", () => {
    window.history.replaceState({}, "", "/page?test=initial");

    render(
      <PageParamsProvider trackQueryParams>
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
