/**
 * Some TplCodeComponent can be transformed during codegen to improve the our generated code.
 * An example of this is the form components: To make the forms tree-shakable, we need to transform
 * a simplified form into an advanced form by replacing the "formItems" prop with some "fake" tpls
 * that are only used to reduce the bundle size.
 * These tpls are not real tpls owned by Plasmic. This way, we need to ensure that they are not overridden
 * or involved in the implicit states system.
 **/

import { TplMgr, getTplComponentArg } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { generateTplsFromFormItems } from "@/wab/shared/code-components/simplified-mode/Forms";
import { ensure } from "@/wab/shared/common";
import { codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { allComponents } from "@/wab/shared/core/sites";
import {
  TplCodeComponent,
  filterTpls,
  flattenTpls,
  getParamVariable,
  isTplCodeComponent,
} from "@/wab/shared/core/tpls";
import {
  Component,
  Site,
  TplNode,
  isKnownDataSourceOpExpr,
} from "@/wab/shared/model/classes";
import { OPTIMIZED_FORM_IMPORT, formComponentName } from "@plasmicpkgs/antd5";

import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";

function makeFormsTreeShakable(component: Component, site: Site) {
  const fakeTpls: TplNode[] = [];
  const formTpls = filterTpls(
    component.tplTree,
    (tpl) => isTplCodeComponent(tpl) && tpl.component.name === formComponentName
  ) as TplCodeComponent[];

  if (formTpls.length === 0) {
    return false;
  }

  const tplFormsWithMode = formTpls.map((tpl) => {
    const baseVs = ensureBaseVariantSetting(tpl);
    const param = ensure(
      tpl.component.params.find((p) => p.variable.name === "mode"),
      "component should have a mode param"
    );
    const modeExpr = getTplComponentArg(tpl, baseVs, param.variable)?.expr;
    const mode = modeExpr
      ? tryExtractJson(modeExpr)
      : param.defaultExpr
      ? tryExtractJson(param.defaultExpr)
      : undefined;
    const isSimplifiedMode = mode === "simplified";
    const isSchemaForm = isKnownDataSourceOpExpr(
      baseVs.args.find((arg) => arg.param.variable.name === "data")?.expr
    );
    return {
      tpl,
      mode: !isSimplifiedMode
        ? ("advanced" as const)
        : isSchemaForm
        ? ("schema" as const)
        : ("simplified" as const),
    };
  });

  if (tplFormsWithMode.some(({ mode }) => mode === "schema")) {
    // since there is at least one schema form, it can't be tree-shaking
    return false;
  }

  const tplMgr = new TplMgr({ site });
  // transform all simplified forms
  for (const { tpl, mode } of tplFormsWithMode) {
    if (mode === "advanced") {
      continue;
    }
    const children = generateTplsFromFormItems(tpl, site, component);
    fakeTpls.push(...children.flatMap((child) => flattenTpls(child)));
    $$$(tpl).clear();
    for (const child of children) {
      $$$(tpl).append(child);
    }
    const baseVs = ensureBaseVariantSetting(tpl);
    tplMgr.setArg(
      tpl,
      baseVs,
      getParamVariable(tpl, "formItems"),
      codeLit(undefined)
    );
    tplMgr.setArg(
      tpl,
      baseVs,
      getParamVariable(tpl, "mode"),
      codeLit(undefined)
    );
    tplMgr.setArg(
      tpl,
      baseVs,
      getParamVariable(tpl, "submitSlot"),
      codeLit(undefined)
    );
  }

  return fakeTpls;
}

export function optimizeGeneratedCodeForHostlessPackages(
  component: Component,
  site: Site,
  isLivePreview: boolean
): Pick<
  SerializerBaseContext,
  "fakeTpls" | "replacedHostlessComponentImportPath"
> {
  if (isLivePreview) {
    return {
      fakeTpls: [],
      replacedHostlessComponentImportPath: new Map(),
    };
  }
  // try to optimize different hostless packages
  const fakeTpls: SerializerBaseContext["fakeTpls"] = [];
  const replacedHostlessComponentImportPath: SerializerBaseContext["replacedHostlessComponentImportPath"] =
    new Map();

  // Forms
  const fakeTplsForForms = makeFormsTreeShakable(component, site);
  if (fakeTplsForForms) {
    const formComponent = ensure(
      allComponents(site, { includeDeps: "direct" }).find(
        (c) => c.name === formComponentName
      ),
      "form component was not found, but the component was tree-shaken."
    );
    fakeTpls.push(...fakeTplsForForms);
    replacedHostlessComponentImportPath.set(
      formComponent,
      OPTIMIZED_FORM_IMPORT.path
    );
  }

  return {
    fakeTpls,
    replacedHostlessComponentImportPath,
  };
}
