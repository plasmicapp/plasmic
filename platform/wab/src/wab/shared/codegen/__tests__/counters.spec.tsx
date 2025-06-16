import "@testing-library/jest-dom/extend-expect";
import { act, getByTestId, getByText, render } from "@testing-library/react";
// polyfill some js features like String.matchAll()
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "core-js";
import * as React from "react";
import tmp from "tmp";
// Exported from https://studio.plasmic.app/projects/a76RKRQpJHMAbDDNBWmUVs
import _bundle from "@/wab/shared/codegen/__tests__/bundles/counters-test.json";

describe("counters blackbox codegen", () => {
  const countersBundle = _bundle[0][1] as Bundle;
  const site = new Bundler().unbundle(countersBundle, "") as Site;

  // NOTE: automatic cleanup via setGracefulCleanup doesn't work with jest.
  // here we're manually removing the folder after the test.
  const dir = tmp.dirSync({ unsafeCleanup: true });
  afterEach(() => {
    dir.removeCallback();
  });
  it("should work", async () => {
    const { importFromProject } = await codegen(dir.name, site);

    const Homepage = (await importFromProject("Homepage.js")).default;

    // Render the component using @testing-library
    render(React.createElement(Homepage));

    // Some basic sanity checks
    const counter1 = document.querySelector(
      `[data-testid="counter1-container"]`
    ) as HTMLElement;
    expect(counter1).not.toBeNull();

    expect(getByText(counter1, "Counter 1")).toBeDefined();
    expect(getByTestId(counter1, "counter1-count")).toHaveTextContent("0");
    act(() => {
      getByText(counter1, "+").click();
    });
    expect(getByTestId(counter1, "counter1-count")).toHaveTextContent("1");
  }, 300000);
});
