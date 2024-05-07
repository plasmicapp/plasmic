import { Component, Site, TplNode, VariantSetting } from "@/wab/classes";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import { NonCssScreenVariantOverrideLintIssue } from "@/wab/shared/linting/lint-types";
import { lintIssuesEquals } from "@/wab/shared/linting/lint-utils";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { isScreenVariant } from "@/wab/shared/Variants";

const TYPE = "non-css-screen-variant-override";

export const lintSite = maybeComputedFn(
  function lintSite(site: Site) {
    const issues: NonCssScreenVariantOverrideLintIssue[] = [];
    for (const comp of site.components) {
      issues.push(...lintComponent(comp));
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintScreenVariantOverrides",
  }
);

const lintComponent = maybeComputedFn(
  function lintComponent(component: Component) {
    const issues: NonCssScreenVariantOverrideLintIssue[] = [];
    for (const tpl of flattenComponent(component)) {
      issues.push(...lintTpl(component, tpl));
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintScreenVariantOverridesComponent",
  }
);

const lintTpl = maybeComputedFn(
  function lintTpl(component: Component, tpl: TplNode) {
    const issues: NonCssScreenVariantOverrideLintIssue[] = [];
    for (const vs of tpl.vsettings) {
      if (vs.variants.some((v) => isScreenVariant(v))) {
        issues.push(...lintVs(component, tpl, vs));
      }
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintScreenVariantOverridesTpl",
  }
);

const lintVs = maybeComputedFn(
  function lintVs(component: Component, tpl: TplNode, vs: VariantSetting) {
    console.log("LINTING", component.name, tpl.uuid);
    const issues: NonCssScreenVariantOverrideLintIssue[] = [];
    for (const attr of Object.keys(vs.attrs)) {
      issues.push({
        type: TYPE,
        key: `${makeKeyPrefix(component, tpl, vs)}-attr-${attr}`,
        component,
        tpl,
        vs,
        prop: { type: "attr", attr },
      });
    }
    for (const arg of vs.args) {
      issues.push({
        type: TYPE,
        key: `${makeKeyPrefix(component, tpl, vs)}-arg-${arg.param.uuid}`,
        component,
        tpl,
        vs,
        prop: { type: "arg", param: arg.param },
      });
    }
    if (vs.text) {
      issues.push({
        type: TYPE,
        key: `${makeKeyPrefix(component, tpl, vs)}-text`,
        component,
        tpl,
        vs,
        prop: { type: "text" },
      });
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintScreenVariantOverridesVs",
  }
);

function makeKeyPrefix(component: Component, tpl: TplNode, vs: VariantSetting) {
  return `${TYPE}-${component.uuid}-${tpl.uuid}-${vs.variants
    .map((v) => v.uuid)
    .join(",")}`;
}
