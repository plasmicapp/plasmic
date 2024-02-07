import { TplNode } from "@/wab/classes";
import * as Components from "@/wab/components";
import { ComponentType } from "@/wab/components";
import { withoutUids } from "@/wab/model/model-meta";
import * as STpls from "@/wab/test/tpls";
import * as Tpls from "@/wab/tpls";

describe("clone", () =>
  it("should handle TplComponents", function () {
    const component = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div", {}),
      type: ComponentType.Plain,
    });
    const tpl = Tpls.mkTplComponent(component, STpls.TEST_GLOBAL_VARIANT, []);
    const clone = Tpls.clone(tpl);
    return expect(withoutUids(clone)).toEqual(withoutUids(tpl));
  }));

describe("flattenTpls", () =>
  it("should work", function () {
    const xs: TplNode[] = [];
    const flattened = Tpls.flattenTpls(
      (xs[0] = Tpls.mkTplTag("div", [
        (xs[1] = STpls.mkTplTestText("hello")),
        (xs[2] = Tpls.mkTplTag("span")),
        (xs[3] = Tpls.mkTplTag("span")),
        (xs[4] = STpls.mkTplTestText("goodbye")),
      ]))
    );
    return expect(flattened).toEqual(xs);
  }));

describe("isComponentCycle", () => {
  it("works", () => {
    const isComponentCycle = 0;
  });
});
