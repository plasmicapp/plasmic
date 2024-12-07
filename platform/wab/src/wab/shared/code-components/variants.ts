import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantCombo, isCodeComponentVariant } from "@/wab/shared/Variants";
import { CodeComponent, isCodeComponent } from "@/wab/shared/core/components";
import {
  TplCodeComponent,
  isComponentRoot,
  isTplCodeComponent,
  isTplComponent,
} from "@/wab/shared/core/tpls";
import {
  CodeComponentMeta,
  CodeComponentVariantMeta,
  Component,
  Site,
  TplNode,
  Variant,
} from "@/wab/shared/model/classes";

export type VariantMetas = CodeComponentMeta["variants"];

export function getVariantMeta(
  variantsMetas: VariantMetas,
  key: string
): CodeComponentVariantMeta | null {
  if (key in variantsMetas) {
    return variantsMetas[key];
  }
  return null;
}

export function hasCodeComponentVariants(variantCombo: VariantCombo) {
  return variantCombo.some(isCodeComponentVariant);
}

export function isCodeComponentWithVariants(component: Component) {
  return isCodeComponent(component)
    ? Object.keys(component.codeComponentMeta.variants).length > 0
    : false;
}

export function isTplRootWithCodeComponentVariants(
  tpl: TplNode
): tpl is TplCodeComponent {
  return (
    isTplComponent(tpl) &&
    isComponentRoot(tpl) &&
    isCodeComponentWithVariants(tpl.component)
  );
}

export function getCodeComponentVariantMeta(
  component: CodeComponent,
  key: string
): CodeComponentVariantMeta | null {
  const metas = component.codeComponentMeta.variants;
  return getVariantMeta(metas, key);
}

export function getTplCodeComponentVariantMeta(
  tpl: TplCodeComponent,
  key: string
): CodeComponentVariantMeta | null {
  return getCodeComponentVariantMeta(tpl.component, key);
}

export function getInvalidCodeComponentVariantsInComponent(
  component: Component
) {
  // We won't check if the component is a code component here, because it may be the
  // case that we removed the code component or swapped it with another component
  const codeComponentVariants = component.variants.filter(
    isCodeComponentVariant
  );
  const unregistredKeys = new Set<string>();
  const invalidVariants: Variant[] = [];

  const variantMeta = isTplCodeComponent(component.tplTree)
    ? component.tplTree.component.codeComponentMeta.variants
    : {};

  codeComponentVariants.forEach((v) => {
    const missingKeys = v.codeComponentVariantKeys.filter(
      (key) => !getVariantMeta(variantMeta, key)
    );
    if (missingKeys.length > 0) {
      invalidVariants.push(v);
      missingKeys.forEach((key) => unregistredKeys.add(key));
    }
  });

  return {
    unregisterdKeys: Array.from(unregistredKeys),
    invalidVariants,
  };
}

export function ensureOnlyValidCodeComponentVariantsInComponent(
  site: Site,
  component: Component
) {
  const tplMgr = new TplMgr({ site });
  const { invalidVariants } =
    getInvalidCodeComponentVariantsInComponent(component);
  tplMgr.tryRemoveVariant(invalidVariants, component);
}
