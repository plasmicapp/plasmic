import {
  findMissingMentions,
  getMentionUiId,
  mkMentionRaw,
  parseMention,
} from "@/wab/client/components/copilot/resource-mention-utils";
import {
  mkModelUiId,
  mkTplUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { mkStyleToken } from "@/wab/commons/StyleToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import { mkVariant } from "@/wab/shared/Variants";
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

describe("mkMentionRaw", () => {
  it("stores the uuid, so a later rename can't break the mention", () => {
    expect(mkMentionRaw({ kind: "token", uuid: "t1", label: "primary" })).toBe(
      "token:t1|primary"
    );
  });

  it("escapes the grammar's delimiters in the label", () => {
    // `/` is not a delimiter of this grammar, so it stays readable.
    expect(
      mkMentionRaw({ kind: "token", uuid: "t1", label: "a|b>c/d%e" })
    ).toBe("token:t1|a%7Cb%3Ec/d%25e");
  });

  it("scopes a tpl uuid by its component", () => {
    expect(
      mkMentionRaw({
        kind: "tpl",
        uuid: "tpl1",
        componentUuid: "comp1",
        tplType: "text",
        label: "Title",
      })
    ).toBe("tpl:comp1/tpl1|Title");
  });

  it("scopes a component variant uuid by its component", () => {
    expect(
      mkMentionRaw({
        kind: "componentVariant",
        uuid: "v1",
        componentUuid: "comp1",
        label: "Large",
      })
    ).toBe("componentVariant:comp1/v1|Large");
  });

  it("round-trips through parseMention", () => {
    const raw = mkMentionRaw({
      kind: "token",
      uuid: "t1",
      label: "brand/primary | dark",
    });
    expect(parseMention(`@<${raw}>`)).toEqual({
      kind: "token",
      uuid: "t1",
      label: "brand/primary | dark",
    });
  });
});

describe("findMissingMentions", () => {
  let site: ReturnType<typeof mkTestSite>["site"];
  let component: ReturnType<typeof mkTestSite>["component"];
  let tpl: ReturnType<typeof mkTestSite>["tpl"];
  let token: ReturnType<typeof mkTestSite>["token"];
  beforeEach(() => {
    ({ site, component, tpl, token } = mkTestSite());
  });

  it("returns nothing when every mention still resolves", () => {
    const text = `use @<token:${token.uuid}|primary> in @<component:${component.uuid}|Card>`;
    expect(findMissingMentions(text, site)).toEqual([]);
  });

  it("returns the label of a mention whose resource is gone", () => {
    expect(findMissingMentions("use @<token:deleted|primary>", site)).toEqual([
      "primary",
    ]);
  });

  it("catches a hand-typed mention that carries no uuid", () => {
    expect(findMissingMentions("use @<token:primary>", site)).toEqual([
      "primary",
    ]);
  });

  it("resolves a mention whose uuid is scoped by its component", () => {
    const raw = mkMentionRaw({
      kind: "tpl",
      uuid: tpl.uuid,
      componentUuid: component.uuid,
      tplType: "text",
      label: "MyElement",
    });
    expect(findMissingMentions(`tweak @<${raw}>`, site)).toEqual([]);
  });

  it("returns the label of a component-scoped mention whose resource is gone", () => {
    expect(
      findMissingMentions(`tweak @<tpl:${component.uuid}/gone|MyElement>`, site)
    ).toEqual(["MyElement"]);
    expect(
      findMissingMentions(`tweak @<tpl:gone/${tpl.uuid}|MyElement>`, site)
    ).toEqual(["MyElement"]);
  });

  it("ignores text that looks like a mention of an unknown kind", () => {
    expect(findMissingMentions("use @<widget:Thing>", site)).toEqual([]);
  });

  it("returns empty for text without mentions", () => {
    expect(findMissingMentions("no mentions here", site)).toEqual([]);
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
