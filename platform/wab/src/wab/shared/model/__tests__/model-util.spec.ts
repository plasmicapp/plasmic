import { Bundler } from "@/wab/shared/bundler";
import { Site } from "@/wab/shared/model/classes";
import { toJson } from "@/wab/shared/model/model-tree-util";
import { readFileSync } from "fs";

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
