import { Bundle } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/linked-props.json";
import {
  codegen,
  collectSnapshotForDir,
} from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import "@testing-library/jest-dom/extend-expect";
import { render, within } from "@testing-library/react";
import "core-js";
import * as React from "react";
import tmp from "tmp";

/**
 * Codegen + render coverage for prop & variant linking via VarRef ("Allow External Access" feature).
 *
 * The bundle defines:
 *   - Inner: a component with `Username` (text) prop and two variant groups
 *     (`Theme` single-select, `Locked` standalone).
 *   - Outer: wraps Inner and forwards three values via VarRef:
 *       Username (regular prop) → Inner.Username
 *       Theme    (choice prop)  → Inner's Theme variant group
 *       Locked   (bool prop)    → Inner's Locked standalone variant
 *   - Prop Linking Test: page with two Outer instances inside #block-1 and
 *     #block-2, using different prop values.
 *
 */
describe("linked props example: codegen", () => {
  let dir: tmp.DirResult;
  const site: Site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });
  afterEach(() => {
    dir.removeCallback();
  });

  it("should codegen correct contents", async () => {
    await codegen(dir.name, site, {
      platform: "react",
      codegenScheme: "blackbox",
      stylesScheme: "css",
    });

    expect(collectSnapshotForDir(dir.name)).toMatchSnapshot();
  });

  it("renders linked variant and prop values through Outer → Inner", async () => {
    const { importFromProject } = await codegen(dir.name, site);

    const PropLinkingTest = (await importFromProject("PropLinkingTest.js"))
      .default;

    render(React.createElement(PropLinkingTest));

    const block1 = within(document.querySelector("#block-1") as HTMLElement);
    const block2 = within(document.querySelector("#block-2") as HTMLElement);

    // block-1: Outer with Username="user 123", Theme="neon", Locked=undefined.
    expect(block1.getByText("user 123")).toBeInTheDocument();
    expect(block1.getByText("Neon")).toBeInTheDocument();
    expect(block1.queryByText("Dark")).not.toBeInTheDocument();
    expect(block1.queryByText("Light")).not.toBeInTheDocument();
    expect(block1.queryByText("Base")).not.toBeInTheDocument();
    expect(block1.queryByText("The content is locked")).not.toBeInTheDocument();

    // block-2: Outer with content Locked=true.
    expect(block2.queryByText("hello world")).not.toBeInTheDocument();
    expect(block2.queryByText("Light")).not.toBeInTheDocument();
    expect(block2.queryByText("Dark")).not.toBeInTheDocument();
    expect(block2.queryByText("Neon")).not.toBeInTheDocument();
    expect(block2.queryByText("Base")).not.toBeInTheDocument();
    expect(block2.getByText("The content is locked")).toBeInTheDocument();
  });
});
