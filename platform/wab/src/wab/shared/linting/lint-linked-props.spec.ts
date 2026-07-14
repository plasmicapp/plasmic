import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplComponent, mkTplTag } from "@/wab/shared/core/tpls";
import {
  findLinkedPropIssuesForParam,
  lintLinkedProps,
} from "@/wab/shared/linting/lint-linked-props";
import { Arg, PropParam, VarRef } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

// Builds a site with an Outer component that instantiates Inner and links
// Inner's prop (the inner) to Outer's prop (the outer) via a VarRef.
function siteWithLink(
  innerType: PropParam["type"],
  outerType: PropParam["type"],
  instances = 1
) {
  const innerParam = mkParam({
    name: "InnerProp",
    type: innerType,
    paramType: "prop",
  });
  const inner = mkComponent({
    name: "Inner",
    type: ComponentType.Plain,
    params: [innerParam],
    tplTree: () => mkTplTag("div"),
  });
  const outerParam = mkParam({
    name: "OuterProp",
    type: outerType,
    paramType: "prop",
  });
  const outer = mkComponent({
    name: "Outer",
    type: ComponentType.Plain,
    params: [outerParam],
    tplTree: (base) => {
      const tplComps = Array.from({ length: instances }, () => {
        const tplComp = mkTplComponent(inner, base);
        tplComp.vsettings[0].args.push(
          new Arg({
            param: innerParam,
            expr: new VarRef({ variable: outerParam.variable }),
          })
        );
        return tplComp;
      });
      return mkTplTag("div", tplComps);
    },
  });
  const site = createSite();
  site.components.push(inner, outer);
  return { site, inner, innerParam, outer, outerParam };
}

describe("lintLinkedProps", () => {
  it("flags a link whose choice options drifted", () => {
    const { site } = siteWithLink(
      typeFactory.choice(["a", "b"]),
      typeFactory.choice(["a", "c"])
    );
    const issues = lintLinkedProps(site);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe("linked-prop-drift");
    expect(issues[0].propName).toBe("InnerProp");
  });

  it("flags a choice inner linked to a looser outer (choice ← text)", () => {
    const { site } = siteWithLink(
      typeFactory.choice(["a", "b"]),
      typeFactory.text()
    );
    expect(lintLinkedProps(site)).toHaveLength(1);
  });

  it("does not flag a compatible link", () => {
    const { site } = siteWithLink(
      typeFactory.choice(["a", "b"]),
      typeFactory.choice(["a", "b"])
    );
    expect(lintLinkedProps(site)).toHaveLength(0);
  });

  it("does not flag a valid widening (text ← choice)", () => {
    // Direction matters: text inner reading a choice outer is fine
    const { site } = siteWithLink(
      typeFactory.text(),
      typeFactory.choice(["a", "b"])
    );
    expect(lintLinkedProps(site)).toHaveLength(0);
  });
});

describe("findLinkedPropIssuesForParam", () => {
  it("finds drift caused by the inner param", () => {
    const { site, inner, innerParam } = siteWithLink(
      typeFactory.choice(["a", "b"]),
      typeFactory.choice(["a", "c"])
    );
    const issues = findLinkedPropIssuesForParam(site, inner, innerParam);
    expect(issues).toHaveLength(1);
    expect(issues[0].propName).toBe("InnerProp");
  });

  it("finds drift when the outer param is edited (not just the inner)", () => {
    const { site, outer, outerParam } = siteWithLink(
      typeFactory.choice(["a", "b"]),
      typeFactory.choice(["a", "c"])
    );
    const issues = findLinkedPropIssuesForParam(site, outer, outerParam);
    expect(issues).toHaveLength(1);
    expect(issues[0].propName).toBe("InnerProp");
  });

  it("reports one issue per drifted instance", () => {
    const { site, inner, innerParam } = siteWithLink(
      typeFactory.choice(["a", "b"]),
      typeFactory.choice(["a", "c"]),
      2
    );
    // Two linked instances drift, so the notification would say "2 ... out of sync".
    expect(findLinkedPropIssuesForParam(site, inner, innerParam)).toHaveLength(
      2
    );
  });

  it("finds nothing when the link stays compatible", () => {
    const { site, inner, innerParam } = siteWithLink(
      typeFactory.choice(["a", "b"]),
      typeFactory.choice(["a", "b"])
    );
    expect(findLinkedPropIssuesForParam(site, inner, innerParam)).toHaveLength(
      0
    );
  });

  it("does not report an unrelated param", () => {
    const { site, inner } = siteWithLink(
      typeFactory.choice(["a", "b"]),
      typeFactory.choice(["a", "c"])
    );
    const unrelated = mkParam({
      name: "Other",
      type: typeFactory.text(),
      paramType: "prop",
    });
    expect(findLinkedPropIssuesForParam(site, inner, unrelated)).toHaveLength(
      0
    );
  });
});
