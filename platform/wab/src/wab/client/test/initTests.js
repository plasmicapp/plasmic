global.PUBLICPATH = "/";
global.DEPLOYENV = "test";

// Set global variables BEFORE importing modules.
// Importing modules may have side-effects that depend on these variables.

import "@/wab/client/moment-config";
import { _testonly } from "@/wab/client/observability";
import { ConsoleLogAnalytics } from "@/wab/shared/observability/ConsoleLogAnalytics";
import { expect } from "@jest/globals";

_testonly.setGlobalAnalytics(new ConsoleLogAnalytics());

function hasEquals(x) {
  return typeof x === "object" && x && "equals" in x;
}

// Tells jest to use this function to test equality in toEquals, toMatchObject, etc.
expect.addEqualityTesters([
  (a, b) => {
    // Ignore ObservableValue since it breaks observable-model.spec.ts
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
