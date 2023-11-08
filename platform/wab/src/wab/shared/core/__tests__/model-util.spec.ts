import { readFileSync } from "fs";
import { Site } from "../../../classes";
import { Bundler } from "../../bundler";
import { toJson } from "../model-tree-util";

describe("model-util", () => {
  it("works", () => {
    const bundle = JSON.parse(
      readFileSync(
        "src/wab/shared/codegen/__tests__/bundles/todomvc.json",
        "utf8"
      )
    );
    const bundler = new Bundler();
    const site = bundler.unbundle(bundle, "uuid") as Site;
    const json = toJson(site, bundler);
    expect(json).toMatchSnapshot();
  });
});
