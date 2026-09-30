import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import {
  mkBaseVariant,
  mkVariant,
  mkVariantSetting,
} from "@/wab/shared/Variants";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplComponent, mkTplTagX } from "@/wab/shared/core/tpls";
import { ValComponent } from "@/wab/shared/core/val-nodes";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import {
  Arg,
  CodeComponentMeta,
  CustomCode,
  StyleExpr,
  StyleTokenRef,
  TplNode,
  VarRef,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { vi } from "vitest";

function setup() {
  const enabled = mkParam({
    name: "enabled",
    paramType: "prop",
    type: typeFactory.bool(),
    defaultExpr: codeLit(true),
  });
  const dependent = mkParam({
    name: "dependent",
    paramType: "prop",
    type: typeFactory.text(),
  });
  const component = mkComponent({
    name: "Conditional",
    type: ComponentType.Code,
    codeComponentMeta: { defaultStyles: null } as CodeComponentMeta,
    params: [enabled, dependent],
    tplTree: mkTplTagX("div"),
  });
  const tpl = mkTplComponent(component, mkBaseVariant(), {
    enabled: codeLit(false),
    dependent: codeLit("stored"),
  });
  const vs = tpl.vsettings[0];
  const viewCtx = Object.assign(Object.create(ViewCtx.prototype), {
    maybeTpl2ValsInContext: vi.fn(() => []),
    componentStackFrames: vi.fn(() => []),
    effectiveCurrentVariantSetting: vi.fn(
      (t: TplNode) => new EffectiveVariantSetting(t, t.vsettings),
    ),
    getCanvasEnvForTpl: vi.fn(),
    projectFlags: () => ({}),
    currentComponent: () => component,
    getContextData: vi.fn(),
    canvasCtx: { win: () => window },
  }) as ViewCtx;
  const propValues = () =>
    viewCtx.getComponentEvalContext(tpl).componentPropValues;
  return { tpl, vs, viewCtx, propValues };
}

describe("getComponentEvalContext", () => {
  it("uses rendered props and context data when a ValComponent exists", () => {
    const { tpl, viewCtx } = setup();
    const val = new ValComponent({ tpl } as any);
    val.codeComponentProps = { enabled: true };
    vi.mocked(viewCtx.maybeTpl2ValsInContext).mockReturnValue([val]);
    vi.mocked(viewCtx.getContextData).mockReturnValue({ ctx: true });
    expect(viewCtx.getComponentEvalContext(tpl)).toMatchObject({
      componentPropValues: val.codeComponentProps,
      ccContextData: { ctx: true },
    });
    expect(viewCtx.effectiveCurrentVariantSetting).not.toHaveBeenCalled();
  });

  it("falls back to model args, then param defaults, when unrendered", () => {
    const { vs, propValues } = setup();
    expect(propValues()).toEqual({ enabled: false, dependent: "stored" });
    vs.args.splice(0, 1);
    expect(propValues().enabled).toBe(true);
  });

  it("joins the style classes of every active variant setting", () => {
    const { tpl, vs, viewCtx, propValues } = setup();
    const className = mkParam({
      name: "className",
      paramType: "prop",
      type: typeFactory.text(),
    });
    tpl.component.params.push(className);
    const styleArg = (uuid: string) =>
      new Arg({ param: className, expr: new StyleExpr({ uuid, styles: [] }) });
    vs.args.push(styleArg("base"));
    const active = mkVariantSetting({
      variants: [mkVariant({ name: "active" })],
      args: [styleArg("active")],
    });
    vi.mocked(viewCtx.effectiveCurrentVariantSetting).mockReturnValue(
      new EffectiveVariantSetting(tpl, [vs, active]),
    );
    expect(propValues().className).toBe("pcls_base pcls_active");
  });

  it("evaluates dynamic args in the canvas env, isolating failures", () => {
    const { vs, viewCtx, propValues } = setup();
    vs.args[0].expr = new CustomCode({
      code: "($ctx.settings.enabled)",
      fallback: codeLit(false),
    });
    vs.args[1].expr = new CustomCode({
      code: "(missing.value)",
      fallback: undefined,
    });
    vi.mocked(viewCtx.getCanvasEnvForTpl).mockReturnValue({
      $ctx: { settings: { enabled: true } },
    } as any);
    expect(propValues()).toEqual({ enabled: true, dependent: undefined });
    vi.mocked(viewCtx.getCanvasEnvForTpl).mockReturnValue({ $ctx: {} } as any);
    expect(propValues().enabled).toBe(false);
  });

  it("skips tpls whose owner has no frame in this view ctx", () => {
    const { tpl, viewCtx, propValues } = setup();
    const owner = mkComponent({
      name: "Owner",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div", {}, tpl),
    });
    expect(propValues()).toEqual({});
    expect(viewCtx.effectiveCurrentVariantSetting).not.toHaveBeenCalled();
    vi.mocked(viewCtx.componentStackFrames).mockReturnValue([
      { component: owner },
    ] as any);
    expect(propValues().dependent).toBe("stored");
  });

  it("resolves token refs unless the prop type keeps them", () => {
    const { tpl, vs, viewCtx, propValues } = setup();
    const site = createSite();
    const token = mkStyleToken({ name: "c", type: "Color", value: "#123456" });
    site.styleTokens.push(token);
    const color = mkParam({
      name: "color",
      paramType: "prop",
      type: typeFactory.color({ noDeref: false }),
    });
    tpl.component.params.push(color);
    vs.args.push(new Arg({ param: color, expr: new StyleTokenRef({ token }) }));
    Object.assign(viewCtx, {
      dbCtx: () => ({ site }),
      variantTplMgr: () => ({ getActivatedVariantsForNode: () => new Set() }),
    });
    expect(propValues().color).toBe("#123456");
    color.type = typeFactory.color({ noDeref: true });
    expect(propValues().color).toBe(mkTokenRef(token));
  });

  it("reads linked props from the wrapper tpl's args", () => {
    const { tpl: inner, vs, viewCtx } = setup();
    const isOn = mkParam({
      name: "isOn",
      paramType: "prop",
      type: typeFactory.bool(),
    });
    vs.args[0].expr = new VarRef({ variable: isOn.variable });
    const wrapper = mkComponent({
      name: "Wrapper",
      type: ComponentType.Plain,
      params: [isOn],
      tplTree: mkTplTagX("div", {}, inner),
    });
    const outer = mkTplComponent(wrapper, mkBaseVariant(), {
      isOn: codeLit(true),
    });
    expect(
      viewCtx.getComponentEvalContext(outer, isOn).componentPropValues.enabled,
    ).toBe(true);
  });
});
