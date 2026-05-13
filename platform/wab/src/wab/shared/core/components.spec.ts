import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  getBaseVariant,
  isCodeComponentVariant,
  isPrivateStyleVariant,
  isStyleVariant,
  mkVariantSetting,
} from "@/wab/shared/Variants";
import { mkShortId, tuple } from "@/wab/shared/common";
import {
  ComponentType,
  extractComponent,
  getFolderComponentDisplayName,
  mkComponent,
} from "@/wab/shared/core/components";
import { customCode, tryExtractJson } from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { CanvasEnv } from "@/wab/shared/eval";
import {
  ComponentDataQuery,
  ComponentServerQuery,
  RuleSet,
  TplTag,
  Variant,
  VariantSetting,
  isKnownCustomCode,
  isKnownObjectPath,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import "jest-extended";

describe("extractComponent", () => {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  const component = tplMgr.addComponent({
    name: "TestComponent",
    type: ComponentType.Plain,
  });
  component.name = "Outer";
  const base = getBaseVariant(component);
  const typeGroup = tplMgr.createVariantGroup({
    component: component,
    name: "type",
  });
  const primary = tplMgr.createVariant(component, typeGroup, "primary");
  const secondary = tplMgr.createVariant(component, typeGroup, "secondary");
  const sizeGroup = tplMgr.createVariantGroup({
    component: component,
    name: "size",
  });
  const large = tplMgr.createVariant(component, sizeGroup, "large");
  const small = tplMgr.createVariant(component, sizeGroup, "small");
  const flavorGroup = tplMgr.createVariantGroup({
    component: component,
    name: "flavor",
  });
  const spicey = tplMgr.createVariant(component, flavorGroup, "spicey");
  const mild = tplMgr.createVariant(component, flavorGroup, "mild");

  const [hover] = tplMgr.createStyleVariant(component, ["Hover"]);
  const hoverPressed = tplMgr.createCodeComponentVariant(component, "test-cc", [
    "HoverCC",
    "PressedCC",
  ]);

  const root = component.tplTree! as TplTag;
  root.vsettings.push(
    mkVariantSetting({
      variants: [primary],
      styles: { background: "linear-gradient(blue, blue)" },
    }),
    mkVariantSetting({
      variants: [hover],
      styles: { background: "linear-gradient(silver, silver)" },
    }),
    mkVariantSetting({
      variants: [hoverPressed],
      styles: { "margin-left": "10px" },
    }),
    mkVariantSetting({
      variants: [large],
      styles: { "padding-left": "20px" },
    })
  );

  const tree1 = mkTplTagX(
    "div",
    {
      baseVariant: base,
      variants: [
        mkVariantSetting({
          variants: [base],
          styles: {},
        }),
        mkVariantSetting({
          variants: [hover],
          styles: { background: "linear-gradient(steel, steel)" },
        }),
        mkVariantSetting({
          variants: [hoverPressed],
          styles: { color: "red" },
        }),
        mkVariantSetting({
          variants: [primary],
          styles: {
            background: "linear-gradient(blue-pink, blue-pink)",
          },
        }),
        mkVariantSetting({
          variants: [primary, large],
          styles: {
            background: "linear-gradient(blue-purple, blue-purple)",
          },
        }),
        mkVariantSetting({
          variants: [primary, hover],
          styles: {
            background: "linear-gradient(blue-yellow, blue-yellow)",
          },
        }),
        mkVariantSetting({
          variants: [spicey],
        }),
      ],
    },
    mkTplTagX("input", {
      baseVariant: base,
      variants: [
        mkVariantSetting({
          variants: [base],
        }),
        mkVariantSetting({
          variants: [primary],
          styles: { "font-weight": "strong" },
        }),
        mkVariantSetting({
          variants: [secondary, hover],
          styles: { "font-style": "italic" },
        }),
        mkVariantSetting({
          variants: [large, hoverPressed],
          styles: { "font-size": "20px" },
        }),
        mkVariantSetting({
          variants: [mild, hover],
        }),
      ],
    })
  );

  const input = tree1.children[0] as TplTag;
  input.vsettings.push(
    mkVariantSetting({
      variants: [tplMgr.createPrivateStyleVariant(component, input, ["Hover"])],
      styles: { "font-weight": "bold" },
    })
  );

  $$$(root).append(tree1);

  const rulesetToStyles = (rs: RuleSet) => {
    const rsh = new RuleSetHelpers(rs, "div");
    return Object.fromEntries(rsh.props().map((p) => tuple(p, rsh.get(p))));
  };

  const simpleStyles = (vs: VariantSetting) => ({
    variants: vs.variants.map(variantName),
    styles: rulesetToStyles(vs.rs),
  });

  const simpleArgs = (vs: VariantSetting) => ({
    ...simpleStyles(vs),
    args: Object.fromEntries(
      vs.args.map((arg) =>
        tuple(
          arg.param.variable.name,
          isKnownVariantsRef(arg.expr)
            ? arg.expr.variants.map((v) => v.uuid)
            : tryExtractJson(arg.expr)
        )
      )
    ),
  });

  // TODO: same as variant-sort spec. Also update it to registered variants
  const variantName = (variant: Variant) => {
    if (isPrivateStyleVariant(variant)) {
      return `:private:${variant.selectors!.join(":")}`;
    } else if (isStyleVariant(variant)) {
      return `:${variant.selectors!.join(":")}`;
    } else if (isCodeComponentVariant(variant)) {
      return `cc-variant-${variant.codeComponentVariantKeys.join("/")}`;
    } else {
      return variant.name;
    }
  };

  it("should extract necessary variants", () => {
    const { tplComponent: tpl } = extractComponent({
      site,
      name: "Inner",
      containingComponent: component,
      tpl: tree1,
      tplMgr: new TplMgr({ site }),
      getCanvasEnvForTpl: () => undefined,
    });
    tplMgr.attachComponent(tpl.component);

    const inner = tpl.component;
    expect(inner.variants.map(variantName)).toEqual([
      "base",
      ":Hover",
      "cc-variant-HoverCC/PressedCC",
      ":private:Hover",
    ]);
    expect(inner.variantGroups.map((g) => g.param.variable.name)).toEqual([
      "type",
      "size",
    ]);
    expect(inner.variantGroups[0].variants.map(variantName)).toEqual([
      "primary",
      "secondary",
    ]);
    expect(inner.variantGroups[1].variants.map(variantName)).toEqual([
      "large",
      "small",
    ]);
    const [newBase, newHover, ccHoverPressed, _newPrivateInputHover] =
      inner.variants;
    const [newPrimary, newSecondary] = inner.variantGroups[0].variants;
    const [newLarge, newSmall] = inner.variantGroups[1].variants;
    expect([
      newBase,
      newHover,
      ccHoverPressed,
      newPrimary,
      newSecondary,
      newLarge,
      newSmall,
    ]).not.toEqual([
      base,
      hover,
      hoverPressed,
      primary,
      secondary,
      large,
      small,
    ]);
    expect((inner.tplTree as TplTag).vsettings.map(simpleStyles)).toEqual([
      {
        variants: ["base"],
        styles: { position: "relative" },
      },
      {
        variants: [":Hover"],
        styles: { background: "linear-gradient(steel, steel)" },
      },

      {
        variants: ["cc-variant-HoverCC/PressedCC"],
        styles: { color: "red" },
      },
      {
        variants: ["primary"],
        styles: { background: "linear-gradient(blue-pink, blue-pink)" },
      },
      {
        variants: ["primary", "large"],
        styles: {
          background: "linear-gradient(blue-purple, blue-purple)",
        },
      },
      {
        variants: ["primary", ":Hover"],
        styles: {
          background: "linear-gradient(blue-yellow, blue-yellow)",
        },
      },
      {
        // from ensureBaseRuleVariantSetting() for the input
        variants: ["secondary"],
        styles: {},
      },
      {
        // from ensureBaseRuleVariantSetting()
        variants: ["large"],
        styles: {},
      },
    ]);
    const innerInput = (inner.tplTree as TplTag).children[0] as TplTag;
    expect(innerInput.tag).toEqual("input");
    expect(innerInput.vsettings.map(simpleStyles)).toIncludeSameMembers([
      {
        variants: ["base"],
        styles: {},
      },
      {
        variants: ["primary"],
        styles: { "font-weight": "strong" },
      },
      {
        variants: ["secondary", ":Hover"],
        styles: { "font-style": "italic" },
      },
      {
        variants: ["large", "cc-variant-HoverCC/PressedCC"],
        styles: { "font-size": "20px" },
      },
      {
        variants: [":private:Hover"],
        styles: { "font-weight": "bold" },
      },
      {
        // from ensureBaseRuleVariantSetting()
        variants: ["secondary"],
        styles: {},
      },
      {
        // from ensureBaseRuleVariantSetting()
        variants: ["large"],
        styles: {},
      },
    ]);

    expect(tpl.vsettings.map(simpleArgs)).toIncludeSameMembers([
      {
        variants: ["base"],
        styles: { width: "default", height: "default" },
        args: {},
      },
      {
        variants: ["primary"],
        styles: {},
        args: { type: [newPrimary.uuid] },
      },
      {
        variants: ["primary", "large"],
        styles: {},
        args: { type: [newPrimary.uuid], size: [newLarge.uuid] },
      },
      {
        variants: ["spicey"],
        styles: {},
        args: {},
      },
      {
        variants: ["secondary"],
        styles: {},
        args: { type: [newSecondary.uuid] },
      },
      {
        variants: ["large"],
        styles: {},
        args: { size: [newLarge.uuid] },
      },
    ]);

    assertSiteInvariants(site);
  });

  it("passes server query references ($q) and data query references ($queries) as props", () => {
    const localSite = createSite();
    const localTplMgr = new TplMgr({ site: localSite });
    const localComponent = localTplMgr.addComponent({
      name: "QueryHost",
      type: ComponentType.Plain,
    });
    const localBase = getBaseVariant(localComponent);

    // Add a server query and a data query directly on the model.
    const serverQuery = new ComponentServerQuery({
      uuid: mkShortId(),
      name: "myServerQuery",
      op: undefined,
    });
    localComponent.serverQueries.push(serverQuery);
    const dataQuery = new ComponentDataQuery({
      uuid: mkShortId(),
      name: "myDataQuery",
      op: undefined,
    });
    localComponent.dataQueries.push(dataQuery);

    const localTree = mkTplTagX("div", {
      baseVariant: localBase,
      attrs: {
        title: customCode("$q.myServerQuery.data + $queries.myDataQuery.data"),
      },
    });
    $$$(localComponent.tplTree).append(localTree);

    const { tplComponent: tpl } = extractComponent({
      site: localSite,
      name: "QueryExtracted",
      containingComponent: localComponent,
      tpl: localTree,
      tplMgr: localTplMgr,
      getCanvasEnvForTpl: () => undefined,
    });
    localTplMgr.attachComponent(tpl.component);

    const inner = tpl.component;

    // The extracted component have props for each referenced query.
    const propNames = inner.params.map((p) => p.variable.name);
    expect(propNames).toContain("myServerQuery");
    expect(propNames).toContain("myDataQuery");

    // The new TplComponent pass $q.<name> and $queries.<name> as the corresponding args.
    const argByParam = Object.fromEntries(
      tpl.vsettings[0].args.map((arg) =>
        tuple(arg.param.variable.name, arg.expr)
      )
    );
    const serverArg = argByParam["myServerQuery"];
    expect(isKnownObjectPath(serverArg)).toBe(true);
    expect(isKnownObjectPath(serverArg) && serverArg.path).toEqual([
      "$q",
      "myServerQuery",
    ]);
    const dataArg = argByParam["myDataQuery"];
    expect(isKnownObjectPath(dataArg)).toBe(true);
    expect(isKnownObjectPath(dataArg) && dataArg.path).toEqual([
      "$queries",
      "myDataQuery",
    ]);

    // Inside the extracted component, $q.<name> and $queries.<name> should be
    // rewritten to $props.<name>.
    const titleExpr = (inner.tplTree as TplTag).vsettings[0].attrs.title;
    expect(isKnownCustomCode(titleExpr)).toBe(true);
    if (isKnownCustomCode(titleExpr)) {
      expect(titleExpr.code).not.toContain("$q.");
      expect(titleExpr.code).not.toContain("$queries.");
      expect(titleExpr.code).toContain("$props.myServerQuery");
      expect(titleExpr.code).toContain("$props.myDataQuery");
    }

    // The original server query and data query remain on the containing
    // component (only the references are rewritten on the inner tree).
    expect(localComponent.serverQueries).toContain(serverQuery);
    expect(localComponent.dataQueries).toContain(dataQuery);

    assertSiteInvariants(localSite);
  });

  it("warns and omits fallback when extracting fallback fails", () => {
    const localSite = createSite();
    const localTplMgr = new TplMgr({ site: localSite });
    const localComponent = localTplMgr.addComponent({
      name: "FallbackTest",
      type: ComponentType.Plain,
    });
    const localBase = getBaseVariant(localComponent);
    const localTree = mkTplTagX("div", {
      baseVariant: localBase,
      attrs: { title: customCode("$ctx.bad.val") },
    });
    $$$(localComponent.tplTree).append(localTree);
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { tplComponent: tpl, warnings } = extractComponent({
      site: localSite,
      name: "Extracted",
      containingComponent: localComponent,
      tpl: localTree,
      tplMgr: localTplMgr,
      getCanvasEnvForTpl: () => ({ $ctx: {} } as CanvasEnv),
    });
    consoleErrorSpy.mockRestore();

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Error extracting fallback in");
    const titleExpr = tpl.component.tplTree.vsettings[0].attrs.title;
    expect(isKnownCustomCode(titleExpr) && titleExpr.fallback).toBeUndefined();
  });
});

describe("getFolderComponentDisplayName", () => {
  const makeComponentWithName = (name: string) =>
    mkComponent({
      name,
      tplTree: mkTplTagX("div"),
      type: ComponentType.Plain,
    });
  it("should return the correct display name for a component in a folder", () => {
    const result = getFolderComponentDisplayName(
      makeComponentWithName("components/buttons/PrimaryButton")
    );
    expect(result).toEqual("PrimaryButton");
  });

  it("should handle components in the root directory correctly", () => {
    const result = getFolderComponentDisplayName(
      makeComponentWithName("SecondaryButton")
    );
    expect(result).toEqual("SecondaryButton");
  });

  it("should trim leading and trailing slashes", () => {
    const result = getFolderComponentDisplayName(
      makeComponentWithName("/components/modals/ConfirmModal/")
    );
    expect(result).toEqual("ConfirmModal");
  });

  it("should trim leading and trailing spaces", () => {
    const result = getFolderComponentDisplayName(
      makeComponentWithName("components/modals/ ConfirmModal ")
    );
    expect(result).toEqual("ConfirmModal");
  });

  it("should handle paths with only slashes", () => {
    const result = getFolderComponentDisplayName(makeComponentWithName("////"));
    expect(result).toEqual("////");
  });
});
