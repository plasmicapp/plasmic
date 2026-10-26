// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlasmicCanvasHost } from "./canvas-host";

function studioScripts() {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>("#plasmic-studio-script"),
  );
}

async function renderHost(node: React.ReactElement) {
  await act(async () => {
    render(node);
  });
}

describe("PlasmicCanvasHost studio script", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // Pretend we're in the Studio's host iframe: window.parent !== window
    const fakeParent = {} as Window;
    Object.defineProperty(window, "parent", {
      configurable: true,
      get: () => fakeParent,
    });
    window.location.hash = "#origin=https://studio.plasmic.app";
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: window,
    });
    vi.restoreAllMocks();
  });

  it("appends the studio script", async () => {
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts().map((s) => s.src)).toEqual([
      "https://studio.plasmic.app/js/studio.js",
    ]);
  });

  it("appends the studio script only once under StrictMode", async () => {
    await renderHost(
      <React.StrictMode>
        <PlasmicCanvasHost />
      </React.StrictMode>,
    );
    expect(studioScripts()).toHaveLength(1);
  });

  it("does not append the studio script again on remount", async () => {
    await renderHost(<PlasmicCanvasHost />);
    cleanup();
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts()).toHaveLength(1);
  });
});

describe("PlasmicCanvasHost URL trust", () => {
  beforeEach(() => {
    Object.defineProperty(window, "parent", { configurable: true, value: {} });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: window,
    });
    vi.restoreAllMocks();
  });

  function setParams(params: Record<string, string>) {
    window.location.hash = new URLSearchParams({
      origin: "https://studio.plasmic.app",
      ...params,
    }).toString();
  }

  it.each([
    "https://attacker.example",
    "https://studio.plasmic.app.attacker.example",
    "https://studio.plasmic.app@attacker.example",
    "https://user:pass@studio.plasmic.app",
    "https://studio.plasmic.app:8443",
    "http://studio.plasmic.app",
    "//studio.plasmic.app",
    "/static",
    "data:text/javascript,window.__securityProof=location.origin;//?",
    "javascript:alert(1)",
    "https://studio.plasmic.app/payload?",
    "https://studio.plasmic.app/payload#",
    "https://studio.plasmic.app/static?x=1",
    "https://studio.plasmic.app/static#x",
    "https://studio.plasmic.app/\\evil",
    "https://studio.plasmic.app/\nstatic",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
    "http://[::1]:3003",
    "",
  ])("blocks unsafe staticBaseUrl %j", async (staticBaseUrl) => {
    setParams({ staticBaseUrl });
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts()).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it.each([
    "../payload",
    "../../payload?",
    "a/b",
    "a\\b",
    "x?",
    "x#",
    "%2f",
    "a.b",
    "a b",
  ])("blocks unsafe hash %j", async (studioHash) => {
    setParams({ studioHash });
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts()).toHaveLength(0);
  });

  it.each(["https://attacker.example", "https://studio.plasmic.app/path", "*"])(
    "blocks an untrusted messaging origin even with trusted assets: %j",
    async (origin) => {
      setParams({
        origin,
        staticBaseUrl: "https://studio-static.plasmic.app/static",
      });
      await renderHost(<PlasmicCanvasHost />);
      expect(studioScripts()).toHaveLength(0);
    },
  );

  it("fails closed when configuration is missing", async () => {
    window.location.hash = "";
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts()).toHaveLength(0);
  });

  it("does not implicitly trust the app host's own origin", async () => {
    setParams({ staticBaseUrl: location.origin });
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts()).toHaveLength(0);
  });

  it("loads production CDN assets", async () => {
    setParams({
      staticBaseUrl: "https://studio-static.plasmic.app/static/",
      studioHash: "5f5756_A-b",
    });
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts().map((s) => s.src)).toEqual([
      "https://studio-static.plasmic.app/static/js/studio.5f5756_A-b.js",
    ]);
  });

  it("ignores the legacy studio-hash query param", async () => {
    window.history.replaceState(null, "", "/?studio-hash=abc123");
    setParams({});
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts()[0].src).toBe(
      "https://studio.plasmic.app/js/studio.js",
    );
  });

  it("supports explicitly trusted Studio and static base URLs", async () => {
    setParams({
      origin: "https://studio.dev.plasmic.app",
      staticBaseUrl: "https://studio-static.dev.plasmic.app/static",
    });
    await renderHost(
      <PlasmicCanvasHost
        allowedStudioOrigins={["https://studio.dev.plasmic.app"]}
        allowedStudioStaticBaseUrl="https://studio-static.dev.plasmic.app"
      />,
    );
    expect(studioScripts()[0].src).toBe(
      "https://studio-static.dev.plasmic.app/static/js/studio.js",
    );
  });

  it.each([
    ["https://cdn.example/studio", "https://cdn.example/studio/static"],
    ["https://cdn.example/studio/", "https://cdn.example/studio"],
  ])(
    "trusts paths under allowedStudioStaticBaseUrl %j: %j",
    async (allowed, staticBaseUrl) => {
      setParams({ origin: "https://studio.example", staticBaseUrl });
      await renderHost(
        <PlasmicCanvasHost
          allowedStudioOrigins={["https://studio.example"]}
          allowedStudioStaticBaseUrl={allowed}
        />,
      );
      expect(studioScripts()).toHaveLength(1);
    },
  );

  it.each([
    "https://cdn.example/studiox",
    "https://cdn.example/studio/../payload",
    "https://cdn.example/studio/%2e%2e/payload",
    "https://cdn.example",
    "https://cdn.example:8443/studio",
  ])(
    "blocks static base URLs outside allowedStudioStaticBaseUrl: %j",
    async (staticBaseUrl) => {
      setParams({ origin: "https://studio.example", staticBaseUrl });
      await renderHost(
        <PlasmicCanvasHost
          allowedStudioOrigins={["https://studio.example"]}
          allowedStudioStaticBaseUrl="https://cdn.example/studio"
        />,
      );
      expect(studioScripts()).toHaveLength(0);
    },
  );

  it.each([
    [{ allowedStudioOrigins: ["https://studio.example"] }, {}],
    [
      { allowedStudioOrigins: ["https://studio.example"] },
      {
        origin: "https://studio.example",
        staticBaseUrl: "https://studio-static.plasmic.app/static",
      },
    ],
    [{ allowedStudioStaticBaseUrl: "https://cdn.example" }, {}],
  ])("drops Plasmic defaults when configured: %j %j", async (props, params) => {
    setParams(params);
    await renderHost(<PlasmicCanvasHost {...props} />);
    expect(studioScripts()).toHaveLength(0);
  });

  it("validates the current fragment after a layout effect changes it", async () => {
    setParams({});
    function ChangeHash() {
      React.useLayoutEffect(() => {
        setParams({ staticBaseUrl: "https://attacker.example" });
      }, []);
      return null;
    }
    await renderHost(
      <>
        <PlasmicCanvasHost />
        <ChangeHash />
      </>,
    );
    expect(studioScripts()).toHaveLength(0);
  });

  it.each(["canvas", "live"])(
    "does not load Studio in %s mode",
    async (mode) => {
      setParams({ [mode]: "true" });
      await renderHost(<PlasmicCanvasHost />);
      expect(studioScripts()).toHaveLength(0);
    },
  );

  it("does not load Studio in a top-level page", async () => {
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: window,
    });
    setParams({});
    await renderHost(<PlasmicCanvasHost />);
    expect(studioScripts()).toHaveLength(0);
  });
});
