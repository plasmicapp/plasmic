import "@testing-library/jest-dom/extend-expect";
import { getByText, render } from "@testing-library/react";
// polyfill some js features like String.matchAll()
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "core-js";
import * as React from "react";
import tmp from "tmp";
// Exported from https://studio.plasmic.app/projects/a76RKRQpJHMAbDDNBWmUVs
import _bundle from "@/wab/shared/codegen/__tests__/bundles/hidden-components.json";

describe("tests codegen for components starting with an underscore", () => {
  const bundle = _bundle[0][1] as Bundle;
  const site = new Bundler().unbundle(bundle, "") as Site;
  let dir: tmp.DirResult;

  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });
  afterEach(() => {
    dir.removeCallback();
  });
  it("should generate code for components starting with an underscore", async () => {
    const { importFromProject } = await codegen(dir.name, site);

    // Card component's display name is "_Card" (see the bundle file)
    const Card = (await importFromProject("Card.js")).default;

    // Render the component using @testing-library
    render(React.createElement(Card));

    const defaultCard = document.querySelector(
      `[data-testid="default-id"]`
    ) as HTMLElement;
    expect(getByText(defaultCard, "Default Card")).toBeDefined();

    // This page contains card component
    const PageWithCard = (await importFromProject("Homepage.js")).default;

    render(React.createElement(PageWithCard));

    const card1 = document.querySelector(
      `[data-testid="card-1"]`
    ) as HTMLElement;

    expect(getByText(card1, "Card 1")).toBeDefined();
  }, 300000);

  it("should not generate code for pages starting with an underscore", async () => {
    const { importFromProject } = await codegen(dir.name, site);
    await expect(importFromProject("Testpage.js")).rejects.toThrow();
  }, 300000);
});
