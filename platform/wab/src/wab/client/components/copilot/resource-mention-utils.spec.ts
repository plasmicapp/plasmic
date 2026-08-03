import {
  findUnresolvedMentions,
  formatMentionInsert,
  getMentionUiId,
  parseMention,
  resolveMentions,
} from "@/wab/client/components/copilot/resource-mention-utils";
import {
  mkModelUiId,
  mkTplUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { mkStyleToken } from "@/wab/commons/StyleToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import { getVariantGroupName, mkVariant } from "@/wab/shared/Variants";
import { mkShortId } from "@/wab/shared/common";
import {
  ComponentType,
  mkComponent,
  mkPageMeta,
} from "@/wab/shared/core/components";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { AnimationSequence } from "@/wab/shared/model/classes";
import { runInAction } from "mobx";

function mkTestSite() {
  const site = createSite();
  const tpl = mkTplTagX("div", { name: "MyElement" });
  const component = mkComponent({
    name: "Card",
    type: ComponentType.Plain,
    tplTree: tpl,
  });
  const page = mkComponent({
    name: "HomePage",
    type: ComponentType.Page,
    tplTree: mkTplTagX("div"),
    pageMeta: mkPageMeta({ path: "/home" }),
  });
  const token = mkStyleToken({
    name: "primary",
    type: "Color",
    value: "#1500FF",
  });
  const screenGroup = site.globalVariantGroups[0];
  const variant = mkVariant({ name: "Mobile", parent: screenGroup });
  const animation = new AnimationSequence({
    uuid: mkShortId(),
    name: "FadeIn",
    keyframes: [],
  });
  runInAction(() => {
    site.components.push(component, page);
    site.styleTokens.push(token);
    screenGroup.variants.push(variant);
    site.animationSequences.push(animation);
  });
  return { site, component, page, tpl, token, variant, animation };
}

describe("parseMention", () => {
  it("parses an unresolved mention", () => {
    expect(parseMention("@<component:Comp>")).toEqual({
      kind: "component",
      uuid: undefined,
      label: "Comp",
    });
  });

  it("parses a resolved mention", () => {
    expect(parseMention("@<component:c1|Comp>")).toEqual({
      kind: "component",
      uuid: "c1",
      label: "Comp",
    });
  });

  it("parses a tpl mention with a composite uuid", () => {
    expect(parseMention("@<tpl:comp1/tpl1|Header>")).toEqual({
      kind: "tpl",
      uuid: "comp1/tpl1",
      label: "Header",
    });
  });

  it("returns undefined for non-mention text", () => {
    expect(parseMention("just text")).toBeUndefined();
  });

  it("returns undefined for an unrecognized kind", () => {
    expect(parseMention("@<widget:Comp>")).toBeUndefined();
  });
});

describe("resolveMentions", () => {
  const { site, component, page, tpl, token, variant, animation } =
    mkTestSite();

  it("folds a component's uuid into the mention", () => {
    expect(resolveMentions("@<component:Card>", site)).toBe(
      `@<component:${component.uuid}|Card>`
    );
  });

  it("folds a page's uuid into the mention", () => {
    expect(resolveMentions("@<page:HomePage>", site)).toBe(
      `@<page:${page.uuid}|HomePage>`
    );
  });

  it("folds a token's uuid into the mention", () => {
    expect(resolveMentions("@<token:primary>", site)).toBe(
      `@<token:${token.uuid}|primary>`
    );
  });

  it("folds an animation's uuid into the mention", () => {
    expect(resolveMentions("@<animation:FadeIn>", site)).toBe(
      `@<animation:${animation.uuid}|FadeIn>`
    );
  });

  it("folds a global variant's uuid into the mention, matched by group", () => {
    const inserted = `@<${formatMentionInsert({
      kind: "globalVariant",
      uuid: variant.uuid,
      label: variant.name,
      owners: [getVariantGroupName(variant) ?? ""],
    })}>`;
    expect(resolveMentions(inserted, site)).toBe(
      `@<globalVariant:${variant.uuid}|Mobile>`
    );
  });

  it("resolves same-named variants in different groups to the right uuid", () => {
    const { site: collisionSite } = mkTestSite();
    const tplMgr = new TplMgr({ site: collisionSite });
    const { themeDark, modeDark } = runInAction(() => {
      const theme = tplMgr.createGlobalVariantGroup("Theme");
      const mode = tplMgr.createGlobalVariantGroup("Mode");
      return {
        themeDark: tplMgr.createGlobalVariant(theme, "Dark"),
        modeDark: tplMgr.createGlobalVariant(mode, "Dark"),
      };
    });

    expect(resolveMentions("@<globalVariant:Theme/Dark>", collisionSite)).toBe(
      `@<globalVariant:${themeDark.uuid}|Dark>`
    );
    expect(resolveMentions("@<globalVariant:Mode/Dark>", collisionSite)).toBe(
      `@<globalVariant:${modeDark.uuid}|Dark>`
    );
  });

  it("resolves a tpl by owning component and name to a composite uuid", () => {
    expect(resolveMentions("@<tpl:Card/MyElement>", site)).toBe(
      `@<tpl:${component.uuid}/${tpl.uuid}|MyElement>`
    );
  });

  it("resolves a component variant by component + group + name", () => {
    const { site: s, component: comp } = mkTestSite();
    const tplMgr = new TplMgr({ site: s });
    const compVariant = runInAction(() => {
      const group = tplMgr.createVariantGroup({
        component: comp,
        name: "Size",
      });
      return tplMgr.createVariant(comp, group, "Large");
    });
    const group = getVariantGroupName(compVariant);
    expect(resolveMentions(`@<componentVariant:Card/${group}/Large>`, s)).toBe(
      `@<componentVariant:${comp.uuid}/${compVariant.uuid}|Large>`
    );
  });

  it("disambiguates same-named component variants by group", () => {
    const { site: s, component: comp } = mkTestSite();
    const tplMgr = new TplMgr({ site: s });
    const { sizeMed, prioMed } = runInAction(() => {
      const size = tplMgr.createVariantGroup({ component: comp, name: "Size" });
      const prio = tplMgr.createVariantGroup({
        component: comp,
        name: "Priority",
      });
      return {
        sizeMed: tplMgr.createVariant(comp, size, "Medium"),
        prioMed: tplMgr.createVariant(comp, prio, "Medium"),
      };
    });
    expect(
      resolveMentions(
        `@<componentVariant:Card/${getVariantGroupName(sizeMed)}/Medium>`,
        s
      )
    ).toBe(`@<componentVariant:${comp.uuid}/${sizeMed.uuid}|Medium>`);
    expect(
      resolveMentions(
        `@<componentVariant:Card/${getVariantGroupName(prioMed)}/Medium>`,
        s
      )
    ).toBe(`@<componentVariant:${comp.uuid}/${prioMed.uuid}|Medium>`);
  });

  it("leaves an unresolvable mention untouched", () => {
    expect(resolveMentions("@<component:Nope>", site)).toBe(
      "@<component:Nope>"
    );
  });

  it("leaves an unknown-kind mention untouched", () => {
    expect(resolveMentions("@<widget:Comp>", site)).toBe("@<widget:Comp>");
  });

  it("does not touch an already-resolved mention", () => {
    expect(resolveMentions("@<component:c1|Foo>", site)).toBe(
      "@<component:c1|Foo>"
    );
  });

  it("leaves text without mentions untouched", () => {
    expect(resolveMentions("just some text", site)).toBe("just some text");
  });
});

describe("findUnresolvedMentions", () => {
  const { site } = mkTestSite();

  it("returns labels of mentions that don't resolve", () => {
    const text = resolveMentions(
      "use @<component:Card>, @<component:Nope> and @<tpl:Card/Gone>",
      site
    );
    // Composite bodies keep their `owner/name` form, which identifies the tag.
    expect(findUnresolvedMentions(text)).toEqual(["Nope", "Card/Gone"]);
  });

  it("returns empty when every mention resolves", () => {
    const text = resolveMentions("use @<component:Card>", site);
    expect(findUnresolvedMentions(text)).toEqual([]);
  });

  it("returns empty for text without mentions", () => {
    expect(findUnresolvedMentions("just some text")).toEqual([]);
  });

  it("ignores unknown-kind mentions", () => {
    expect(
      findUnresolvedMentions("@<widget:Comp> and @<component:Nope>")
    ).toEqual(["Nope"]);
  });
});

describe("grammar-char escaping", () => {
  it("escapes grammar delimiters but leaves `/` readable", () => {
    expect(
      formatMentionInsert({ kind: "token", uuid: "t1", label: "a|b>c/d" })
    ).toBe("token:a%7Cb%3Ec/d");
  });

  it("qualifies a variant mention with its group (owner keeps folder `/`s)", () => {
    expect(
      formatMentionInsert({
        kind: "globalVariant",
        uuid: "v1",
        label: "Dark",
        owners: ["Theme"],
      })
    ).toBe("globalVariant:Theme/Dark");
  });

  it("qualifies a component variant mention with its component and group", () => {
    expect(
      formatMentionInsert({
        kind: "componentVariant",
        uuid: "v1",
        label: "Large",
        owners: ["Card", "Size"],
      })
    ).toBe("componentVariant:Card/Size/Large");
  });

  it("resolves a token whose name contains multiple escapable characters", () => {
    const site = createSite();
    const token = mkStyleToken({
      name: "brand/primary | dark",
      type: "Color",
      value: "#000000",
    });
    runInAction(() => site.styleTokens.push(token));

    const inserted = `@<${formatMentionInsert({
      kind: "token",
      uuid: token.uuid,
      label: token.name,
    })}>`;
    const resolved = resolveMentions(inserted, site);
    expect(resolved).toBe(`@<token:${token.uuid}|brand/primary %7C dark>`);
    expect(parseMention(resolved)?.label).toBe("brand/primary | dark");
  });

  it("resolves a tpl whose owning component name contains folder `/`s", () => {
    const site = createSite();
    const tpl = mkTplTagX("div", { name: "MyElement" });
    const component = mkComponent({
      name: "Buttons/Primary",
      type: ComponentType.Plain,
      tplTree: tpl,
    });
    runInAction(() => site.components.push(component));

    // The owner keeps its folder `/`s literally; splitting on the last `/`
    // separates it from the tpl name.
    expect(resolveMentions("@<tpl:Buttons/Primary/MyElement>", site)).toBe(
      `@<tpl:${component.uuid}/${tpl.uuid}|MyElement>`
    );
  });

  it("escapes `/` in the tpl name so the last `/` is the separator", () => {
    const site = createSite();
    const tpl = mkTplTagX("div", { name: "Icon/Left" });
    const component = mkComponent({
      name: "Nav/Bar",
      type: ComponentType.Plain,
      tplTree: tpl,
    });
    runInAction(() => site.components.push(component));

    // Owner "Nav/Bar" stays literal; tpl "Icon/Left" escapes its "/" to "%2F".
    expect(resolveMentions("@<tpl:Nav/Bar/Icon%2FLeft>", site)).toBe(
      `@<tpl:${component.uuid}/${tpl.uuid}|Icon%2FLeft>`
    );
  });
});

describe("getMentionUiId", () => {
  const { site, component, page, tpl, token, variant, animation } =
    mkTestSite();

  it("returns a Model UiId for a component", () => {
    expect(getMentionUiId("component", component.uuid, site)).toBe(
      mkModelUiId({ typeTag: "Component", uuid: component.uuid })
    );
  });

  it("returns a Model UiId for a page", () => {
    expect(getMentionUiId("page", page.uuid, site)).toBe(
      mkModelUiId({ typeTag: "Component", uuid: page.uuid })
    );
  });

  it("returns a Model UiId for a token", () => {
    expect(getMentionUiId("token", token.uuid, site)).toBe(
      mkModelUiId({ typeTag: "StyleToken", uuid: token.uuid })
    );
  });

  it("returns a Model UiId for a global variant", () => {
    expect(getMentionUiId("globalVariant", variant.uuid, site)).toBe(
      mkModelUiId({ typeTag: "Variant", uuid: variant.uuid })
    );
  });

  it("returns a Model UiId for an animation", () => {
    expect(getMentionUiId("animation", animation.uuid, site)).toBe(
      mkModelUiId({ typeTag: "AnimationSequence", uuid: animation.uuid })
    );
  });

  it("returns a Model UiId for a component variant", () => {
    const { site: s, component: comp } = mkTestSite();
    const tplMgr = new TplMgr({ site: s });
    const cv = runInAction(() => {
      const group = tplMgr.createVariantGroup({
        component: comp,
        name: "Size",
      });
      return tplMgr.createVariant(comp, group, "Large");
    });
    expect(
      getMentionUiId("componentVariant", `${comp.uuid}/${cv.uuid}`, s)
    ).toBe(mkModelUiId({ typeTag: "Variant", uuid: cv.uuid }));
  });

  it("returns a Tpl UiId for a tpl (composite uuid)", () => {
    expect(getMentionUiId("tpl", `${component.uuid}/${tpl.uuid}`, site)).toBe(
      mkTplUiId(component.uuid, tpl.uuid)
    );
  });

  it("returns undefined when the resource no longer exists", () => {
    expect(getMentionUiId("component", "nope", site)).toBeUndefined();
    expect(
      getMentionUiId("tpl", `${component.uuid}/nope`, site)
    ).toBeUndefined();
  });
});
