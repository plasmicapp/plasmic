// The env vars these modules read at import time are set by `test.env` in
// vitest.config.ts, since ESM hoists imports above any assignment here.

import { mockMatchMedia } from "@/wab/__mocks__/matchMedia";
import "@/wab/client/moment-config";
import { _testonly } from "@/wab/client/observability";
import { ConsoleLogAnalytics } from "@/wab/shared/observability/ConsoleLogAnalytics";
import { expect } from "vitest";

_testonly.setGlobalAnalytics(new ConsoleLogAnalytics());

// Mock methods which are not implemented in JSDOM
// https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
if (typeof window !== "undefined") {
  mockMatchMedia(false);
}

function hasEquals(x) {
  return typeof x === "object" && x && "equals" in x;
}

// Tells vitest to use this function to test equality in toEquals, toMatchObject, etc.
expect.addEqualityTesters([
  (a, b) => {
    // Ignore mobx's boxed ObservableValue since it breaks observable-model.spec.ts.
    // To fix it, we need to add custom .equals for our generated schema.
    if (
      hasEquals(a) &&
      hasEquals(b) &&
      a.constructor.name !== "ObservableValue" &&
      b.constructor.name !== "ObservableValue"
    ) {
      return a.equals(b) && b.equals(a);
    }
    return undefined; // continue to next tester
  },
]);
