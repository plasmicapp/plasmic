// @vitest-environment jsdom

import React, { act } from "react";
import { Root, createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server.node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataCtxReader, PageParamsProvider } from "./data";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function formatQueryValue(value: string | string[]) {
  return Array.isArray(value) ? value.join(",") : value;
}

function QueryReader({ name = "test" }: { name?: string }) {
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

describe("PageParamsProvider query params", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    root = undefined;
    container.remove();
  });

  function renderClient(ui: React.ReactElement) {
    act(() => {
      root = createRoot(container);
      root.render(ui);
    });
  }

  function queryText(name: string) {
    return container.querySelector(`[data-testid="${name}"]`)?.textContent;
  }

  it("provides query params from props during server rendering", () => {
    const html = renderToString(
      <PageParamsProvider query={{ test: "from-props", multi: ["a", "b"] }}>
        <QueryReader />
        <QueryReader name="multi" />
      </PageParamsProvider>
    );

    expect(html).toContain("from-props");
    expect(html).toContain("a,b");
  });

  it("reads query params from the current browser location", () => {
    window.history.replaceState({}, "", "/page?test=Hello&multi=1&multi=2");

    renderClient(
      <PageParamsProvider>
        <QueryReader />
        <QueryReader name="multi" />
      </PageParamsProvider>
    );

    expect(queryText("test")).toBe("Hello");
    expect(queryText("multi")).toBe("1,2");
  });

  it("updates when browser history changes query params", () => {
    window.history.replaceState({}, "", "/page?test=initial");

    renderClient(
      <PageParamsProvider>
        <QueryReader />
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
