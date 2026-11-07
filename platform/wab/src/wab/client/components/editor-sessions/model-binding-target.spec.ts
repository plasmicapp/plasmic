import { modelBindingTarget } from "@/wab/client/components/editor-sessions/model-binding-target";
import { captureModelTarget } from "@/wab/client/components/editor-sessions/model-target";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensureVariantSetting, mkVariant } from "@/wab/shared/Variants";
import {
  createTplMgr,
  createVariantTplMgr,
} from "@/wab/shared/__testonly__/site-tests-utils";
import * as componentProps from "@/wab/shared/component-props";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { code, codeLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { mkRep, mkTplComponent, mkTplTagX } from "@/wab/shared/core/tpls";
import { ExprText, ObjectPath, RawText } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

function setup() {
  const tpl = mkTplTagX("span");
  const component = mkComponent({
    name: "Binding",
    type: ComponentType.Plain,
    tplTree: tpl,
  });
  const site = createSite();
  site.components = [component];
  const variant = mkVariant({ name: "Hover", selectors: [":hover"] });
  component.variants = [...component.variants, variant];
  const vtm = createVariantTplMgr(site, createTplMgr(site), component);
  const base = vtm.ensureBaseVariantSetting(tpl);
  const vs = ensureVariantSetting(tpl, [variant]);
  let env = { value: "first" };
  const getCanvasEnvForTpl = vi.fn(() => env);
  const viewCtx = {
    site,
    currentComponent: () => component,
    variantTplMgr: () => vtm,
    focusedCloneKey: () => "original-clone",
    projectFlags: () => ({}),
    customFunctionsSchema: () => ({}),
    getCanvasEnvForTpl,
  } as unknown as ViewCtx;
  Object.assign(viewCtx, {
    studioCtx: {
      viewCtxs: [viewCtx],
      changeUnsafe: async (fn: () => void) => fn(),
    },
  });
  return {
    tpl,
    component,
    variant,
    base,
    vs,
    viewCtx,
    getCanvasEnvForTpl,
    setEnv: (next: typeof env) => {
      env = next;
    },
  };
}

it("writes and unlinks an inherited attribute in its pinned variant", async () => {
  const { tpl, variant, base, vs, viewCtx } = setup();
  base.attrs = {
    title: new ObjectPath({ path: ["old"], fallback: codeLit("fallback") }),
  };
  const target = modelBindingTarget(viewCtx, tpl, [variant], {
    kind: "attr",
    attr: "title",
  });
  await target.write(["new"]);
  expect(vs.attrs.title).toMatchObject({ path: ["new"] });
  expect(base.attrs.title).toMatchObject({ path: ["old"] });
  await target.unlink?.();
  expect(vs.attrs.title).toMatchObject({ code: '"fallback"' });
});

it("keeps rich-text flags when writing and restores fallback text on unlink", async () => {
  const { tpl, variant, base, vs, viewCtx } = setup();
  base.text = new ExprText({
    expr: new ObjectPath({ path: ["old"], fallback: codeLit("fallback") }),
    html: true,
  });
  const target = modelBindingTarget(viewCtx, tpl, [variant], { kind: "text" });
  await target.write(["new"]);
  expect(vs.text).toMatchObject({ html: true, expr: { path: ["new"] } });
  await target.unlink?.();
  expect(vs.text).toBeInstanceOf(RawText);
  expect(vs.text).toMatchObject({ text: "fallback", markers: [] });
});

it("writes visibility to the original variant and detects external edits", async () => {
  const { tpl, variant, base, vs, viewCtx } = setup();
  base.dataCond = new ObjectPath({ path: ["visible"], fallback: code("true") });
  const target = modelBindingTarget(viewCtx, tpl, [variant], {
    kind: "visibility",
  });
  const captured = captureModelTarget(target);
  await target.write("1 === 1");
  expect(vs.dataCond).toMatchObject({ code: "(1 === 1)" });
  expect(base.dataCond).toMatchObject({ path: ["visible"] });
  expect(captured.check()).toContain("changed outside");
  await target.unlink?.();
  expect(vs.dataCond).toMatchObject({ code: "true" });
});

it("reads live data in the original repeated-item scope after its opener is gone", () => {
  const { tpl, variant, viewCtx, getCanvasEnvForTpl, setEnv } = setup();
  const target = modelBindingTarget(viewCtx, tpl, [variant], {
    kind: "collection",
  });
  expect(
    target.data({ ...target.context, cloneKey: "original-clone" }),
  ).toEqual({ value: "first" });
  setEnv({ value: "second" });
  expect(
    target.data({ ...target.context, cloneKey: "original-clone" }),
  ).toEqual({ value: "second" });
  expect(getCanvasEnvForTpl).toHaveBeenLastCalledWith(tpl, {
    anchorCloneKey: "original-clone",
    ignoreFocusedCloneKey: true,
    forDataRepCollection: true,
  });
});

it.each(["prop", "slot"] as const)(
  "updates a %s argument in its own setting and detects a removed param",
  async (paramType) => {
    const { tpl: root, component, variant, viewCtx } = setup();
    const param =
      paramType === "slot"
        ? mkParam({ name: "label", type: typeFactory.renderable(), paramType })
        : mkParam({ name: "label", type: typeFactory.text(), paramType });
    vi.spyOn(componentProps, "inferPropTypeFromParam").mockReturnValue(
      "string",
    );
    const child = mkComponent({
      name: "Child",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
      params: [param],
    });
    viewCtx.site.components = [...viewCtx.site.components, child];
    const tpl = mkTplComponent(child, component.variants[0]);
    root.children = [tpl];
    tpl.parent = root;
    const vtm = viewCtx.variantTplMgr();
    vtm.setArgUnderVariantSetting(
      tpl,
      param.variable,
      new ObjectPath({ path: ["old"], fallback: codeLit("fallback") }),
      vtm.ensureBaseVariantSetting(tpl),
    );
    const target = modelBindingTarget(viewCtx, tpl, [variant], {
      kind: "arg",
      param,
    });
    const captured = captureModelTarget(target);
    await target.write(["new"]);
    const vs =
      paramType === "slot"
        ? vtm.ensureBaseVariantSetting(tpl)
        : vtm.ensureVariantSetting(tpl, [variant]);
    expect(vs.args[0].expr).toMatchObject({ path: ["new"] });
    expect(captured.check()).toContain("changed outside");
    await target.unlink?.();
    expect(vs.args[0].expr).toMatchObject({ code: '"fallback"' });
    vtm.setArgUnderVariantSetting(
      tpl,
      param.variable,
      new ObjectPath({ path: ["noFallback"], fallback: undefined }),
      vs,
    );
    await target.unlink?.();
    expect(vs.args).toEqual([]);
    if (paramType === "slot") {
      expect(tpl.vsettings).toEqual([vs]);
    }
    child.params = [];
    expect(target.exists()).toBe(false);
  },
);

it("updates a repeat collection and retains its empty-array fallback", async () => {
  const { tpl, base, viewCtx } = setup();
  base.dataRep = mkRep("item", code("[]"));
  const target = modelBindingTarget(viewCtx, tpl, base.variants, {
    kind: "collection",
  });
  await target.write(["items"]);
  expect(base.dataRep.collection).toMatchObject({
    path: ["items"],
    fallback: { code: "([])" },
  });
});

it("propagates unlink failures synchronously to the enclosing change", () => {
  const { tpl, variant, viewCtx } = setup();
  const target = modelBindingTarget(viewCtx, tpl, [variant], { kind: "text" });
  vi.spyOn(viewCtx.variantTplMgr(), "ensureVariantSetting").mockImplementation(
    () => {
      throw new Error("Cannot update binding");
    },
  );
  expect(() => target.unlink?.()).toThrow("Cannot update binding");
});
