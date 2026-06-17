import { createComponent } from "@/wab/client/operations/create-component";
import { createVariant } from "@/wab/client/operations/create-variant";
import { createVariantGroup } from "@/wab/client/operations/create-variant-group";
import {
  TplMgr,
  VariantOptionsType,
  getTplComponentArg,
} from "@/wab/shared/TplMgr";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import * as Tpls from "@/wab/shared/core/tpls";
import { Param, TplComponent, TplTag } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { createVariantTplMgr } from "@/wab/shared/tests/site-tests-utils";

export function setupComponentWithTplTree(tplTree: TplTag) {
  const component = mkComponent({
    tplTree,
    type: ComponentType.Plain,
  });
  const site = createSite();
  site.components.push(component);
  Tpls.trackComponentSite(component, site);
  Tpls.trackComponentRoot(component);
  const tplMgr = new TplMgr({ site });
  const vtm = createVariantTplMgr(site, tplMgr);
  return { component, site, tplMgr, vtm };
}

/**
 * Set up a "Button" component with prop params of each type (text, num, bool,
 * any, choice "tone", dateString "publishedAt", dateRangeStrings "activeRange",
 * slot, and a queryData "query" that the data-props converter does not support
 * yet) and variant groups of each kind (single choice "size", multi choice
 * "features", standalone "dark"), plus an instance of it in a containing
 * component, with the instance's base VariantSetting resolved.
 */
export function setupComponentWithInstance() {
  const {
    site,
    tplMgr,
    vtm,
    component: page,
  } = setupComponentWithTplTree(Tpls.mkTplTagX("div", {}));

  const created = createComponent({
    tplMgr,
    name: "Button",
    type: ComponentType.Plain,
  });
  assert(created.result === "success", "component setup failed");
  const button = created.component;

  button.params.push(
    mkParam({ name: "label", type: typeFactory.text(), paramType: "prop" }),
    mkParam({ name: "count", type: typeFactory.num(), paramType: "prop" }),
    mkParam({ name: "disabled", type: typeFactory.bool(), paramType: "prop" }),
    mkParam({ name: "data", type: typeFactory.any(), paramType: "prop" }),
    mkParam({
      name: "tone",
      type: typeFactory.choice(["primary", "secondary"]),
      paramType: "prop",
    }),
    mkParam({
      name: "publishedAt",
      type: typeFactory.dateString(),
      paramType: "prop",
    }),
    mkParam({
      name: "activeRange",
      type: typeFactory.dateRangeStrings(),
      paramType: "prop",
    }),
    mkParam({
      name: "query",
      type: typeFactory.queryData(),
      paramType: "prop",
    }),
    mkParam({
      name: "children",
      type: typeFactory.renderable(),
      paramType: "slot",
    })
  );

  const sizeResult = createVariantGroup({
    component: button,
    tplMgr,
    name: "size",
    optionsType: VariantOptionsType.singleChoice,
  });
  assert(sizeResult.result === "success", "size group setup failed");
  const sizeGroup = sizeResult.group;
  for (const name of ["small", "large"]) {
    const variantResult = createVariant({
      component: button,
      tplMgr,
      variantGroup: sizeGroup,
      name,
    });
    assert(variantResult.result === "success", "size variant setup failed");
  }

  const featuresResult = createVariantGroup({
    component: button,
    tplMgr,
    name: "features",
    optionsType: VariantOptionsType.multiChoice,
  });
  assert(featuresResult.result === "success", "features group setup failed");
  const featuresGroup = featuresResult.group;
  for (const name of ["rounded", "shadow"]) {
    const variantResult = createVariant({
      component: button,
      tplMgr,
      variantGroup: featuresGroup,
      name,
    });
    assert(variantResult.result === "success", "features variant setup failed");
  }

  const darkResult = createVariantGroup({
    component: button,
    tplMgr,
    name: "dark",
    optionsType: VariantOptionsType.standalone,
  });
  assert(darkResult.result === "success", "dark group setup failed");
  const darkGroup = darkResult.group;

  const baseVariant = getBaseVariant(page);
  const instance = Tpls.mkTplComponentX({
    component: button,
    baseVariant,
  });
  const root = page.tplTree as TplTag;
  root.children.push(instance);
  instance.parent = root;

  const vs = ensureVariantSetting(instance, [baseVariant]);

  const findParam = (name: string): Param => {
    const param = button.params.find((p) => p.variable.name === name);
    assert(param, `param "${name}" must exist`);
    return param;
  };

  const getArg = (instanceTpl: TplComponent, paramName: string) => {
    return getTplComponentArg(instanceTpl, vs, findParam(paramName).variable);
  };

  return {
    site,
    tplMgr,
    vtm,
    page,
    button,
    sizeGroup,
    featuresGroup,
    darkGroup,
    instance,
    vs,
    getArg,
    opts: { vs, tplMgr },
  };
}
