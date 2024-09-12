import { TplMgr } from "@/wab/shared/TplMgr";
import {
  StyleVariant,
  VariantCombo,
  isStyleVariant,
} from "@/wab/shared/Variants";
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

// In the model, we include a prefix in the code component variant selector to distinguish it from other selectors
// This makes it easier to identify the code component variant selectors when we need to process them in the code.
const CC_VARIANT_PREFIX = "$cc-variant$";

export function isCodeComponentVariantKey(key: string) {
  return key.startsWith(CC_VARIANT_PREFIX);
}

export function mkCodeComponentVariantKey(key: string) {
  return `${CC_VARIANT_PREFIX}${key}`;
}

export function withoutCodeComponentVariantPrefix(key: string) {
  return key.replace(CC_VARIANT_PREFIX, "");
}

export function isCodeComponentVariant(
  variant: Variant
): variant is StyleVariant {
  return (
    isStyleVariant(variant) &&
    variant.selectors.every((selector) => isCodeComponentVariantKey(selector))
  );
}

export function getVariantMeta(
  variantsMetas: VariantMetas,
  key: string
): CodeComponentVariantMeta | null {
  const keyWithoutPrefix = withoutCodeComponentVariantPrefix(key);
  if (keyWithoutPrefix in variantsMetas) {
    return variantsMetas[keyWithoutPrefix];
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
  const unregistredSelectors = new Set<string>();
  const invalidVariants: Variant[] = [];

  const variantMeta = isTplCodeComponent(component.tplTree)
    ? component.tplTree.component.codeComponentMeta.variants
    : {};

  codeComponentVariants.forEach((v) => {
    const missingSelectors = v.selectors.filter(
      (selector) => !getVariantMeta(variantMeta, selector)
    );

    if (missingSelectors.length > 0) {
      invalidVariants.push(v);
      missingSelectors.forEach((selector) =>
        unregistredSelectors.add(selector)
      );
    }
  });

  return {
    unregisterdSelectors: Array.from(unregistredSelectors),
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
