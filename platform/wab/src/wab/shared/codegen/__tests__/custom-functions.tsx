// eslint-disable-next-line import/no-extraneous-dependencies
import "@testing-library/jest-dom/extend-expect";
// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from "@testing-library/react";
// polyfill some js features like String.matchAll()
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "core-js";
import fs from "fs";
import path from "path";
import * as React from "react";
import tmp from "tmp";
// Exported from https://studio.plasmic.app/projects/p4ABdMDb4xMuoc9mL7Lf2y
import _bundle from "@/wab/shared/codegen/__tests__/bundles/custom-functions-test.json";

describe("tests codegen for custom functions", () => {
  const countersBundle = _bundle[0][1] as Bundle;
  const site = new Bundler().unbundle(countersBundle, "") as Site;

  // NOTE: automatic cleanup via setGracefulCleanup doesn't work with jest.
  // here we're manually removing the folder after the test.
  const dir = tmp.dirSync({ unsafeCleanup: true });
  afterEach(() => {
    dir.removeCallback();
  });
  it("should work", async () => {
    // The import names are expected to be fixed by the CLI, but
    // since we are handling the codegen output directly, we will use
    // the temporary file names for the custom functions.
    fs.writeFileSync(
      path.join(dir.name, "importPath__math.sum.js"),
      `
export const sum = (a, b) => a + b;
      `
    );
    fs.writeFileSync(
      path.join(dir.name, "importPath__math.subtract.js"),
      `
const subtract = (a, b) => a - b;
export default subtract;
      `
    );
    fs.writeFileSync(
      path.join(dir.name, "importPath__greeting.js"),
      `
export const greeting = (fromName) => \`Hello from \${fromName}!\`;
      `
    );

    const { importFromProject } = await codegen(dir.name, site);

    const Homepage = (await importFromProject("Homepage.js")).default;

    // Render the component using @testing-library
    render(React.createElement(Homepage));

    // Some basic sanity checks
    // Notice we are using title HTML attribute instead of looking for the
    // text contents for simplicity! The contents and the attr receive the same
    // text in the project.
    const textElt1 = document.querySelector(
      `[title="The result is: 10"]`
    ) as HTMLElement;
    expect(textElt1).not.toBeNil();

    const textElt2 = document.querySelector(
      `[title="Hello from Plasmic!"]`
    ) as HTMLElement;
    expect(textElt2).not.toBeNil();
  }, 300000);
});
