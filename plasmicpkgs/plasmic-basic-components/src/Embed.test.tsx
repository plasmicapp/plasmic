// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Embed } from "./Embed";

const script = (name: string) =>
  document.querySelector<HTMLScriptElement>(`script[src$="${name}"]`)!;

beforeEach(() => {
  // jsdom runs Embed's identifier script on its own window, not vitest's global.
  vi.stubGlobal("window", (globalThis as any).jsdom.window);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Storybook CI uses production React, which has no Strict Mode effect replay.
it.each([{ selfRemoving: false }, { selfRemoving: true }])(
  "loads the next script under Strict Mode when selfRemoving=$selfRemoving",
  async ({ selfRemoving }) => {
    render(
      <React.StrictMode>
        <Embed code='<script src="https://x/1.js"></script><script src="https://x/2.js"></script>' />
      </React.StrictMode>,
    );
    const first = script("1.js");
    const second = script("2.js");
    if (selfRemoving) {
      first.remove();
    }

    await act(async () => {
      first.dispatchEvent(new Event("load"));
    });

    expect(script("2.js")).not.toBe(second);
  },
);
