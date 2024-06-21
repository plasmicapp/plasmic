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
  CodeComponentInteractionVariantMeta,
  CodeComponentMeta,
  Component,
  Site,
  TplNode,
  Variant,
} from "@/wab/shared/model/classes";

export type InteractionVariantMetas =
  CodeComponentMeta["interactionVariantMeta"];

// In the model, we include a prefix in the interaction variant selector to distinguish it from other selectors
// This makes it easier to identify the interaction variant selectors when we need to process them in the code.
const INTERACTION_VARIANT_PREFIX = "$cc-interaction$";

export function isCodeComponentInteractionVariantKey(key: string) {
  return key.startsWith(INTERACTION_VARIANT_PREFIX);
}

export function mkCodeComponentInteractionVariantKey(key: string) {
  return `${INTERACTION_VARIANT_PREFIX}${key}`;
}

export function withoutInteractionVariantPrefix(key: string) {
  return key.replace(INTERACTION_VARIANT_PREFIX, "");
}

export function isCodeComponentInteractionVariant(
  variant: Variant
): variant is StyleVariant {
  return (
    isStyleVariant(variant) &&
    variant.selectors.every((selector) =>
      isCodeComponentInteractionVariantKey(selector)
    )
  );
}

export function getInteractionVariantMeta(
  interactionVariantsMetas: InteractionVariantMetas,
  key: string
): CodeComponentInteractionVariantMeta | null {
  const keyWithoutPrefix = withoutInteractionVariantPrefix(key);
  if (keyWithoutPrefix in interactionVariantsMetas) {
    return interactionVariantsMetas[keyWithoutPrefix];
  }
  return null;
}

export function hasCodeComponentInteractionVariants(
  variantCombo: VariantCombo
) {
  return variantCombo.some(isCodeComponentInteractionVariant);
}

export function isCodeComponentWithInteractionVariants(component: Component) {
  return isCodeComponent(component)
    ? Object.keys(component.codeComponentMeta.interactionVariantMeta).length > 0
    : false;
}

export function isTplRootWithCodeComponentInteractionVariants(
  tpl: TplNode
): tpl is TplCodeComponent {
  return (
    isTplComponent(tpl) &&
    isComponentRoot(tpl) &&
    isCodeComponentWithInteractionVariants(tpl.component)
  );
}

export function getCodeComponentInteractionVariantMeta(
  component: CodeComponent,
  key: string
): CodeComponentInteractionVariantMeta | null {
  const metas = component.codeComponentMeta.interactionVariantMeta;
  return getInteractionVariantMeta(metas, key);
}

export function getTplCodeComponentInteractionVariantMeta(
  tpl: TplCodeComponent,
  key: string
): CodeComponentInteractionVariantMeta | null {
  return getCodeComponentInteractionVariantMeta(tpl.component, key);
}

export function getInvalidInteractiveVariantsInComponent(component: Component) {
  // We won't check if the component is a code component here, because it may be the
  // case that we removed the code component or swapped it with another component
  const codeComponentInteractionVariants = component.variants.filter(
    isCodeComponentInteractionVariant
  );
  const unregistredSelectors = new Set<string>();
  const invalidVariants: Variant[] = [];

  const interactionVariantMeta = isTplCodeComponent(component.tplTree)
    ? component.tplTree.component.codeComponentMeta.interactionVariantMeta
    : {};

  codeComponentInteractionVariants.forEach((v) => {
    const missingSelectors = v.selectors.filter(
      (selector) => !getInteractionVariantMeta(interactionVariantMeta, selector)
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

export function ensureOnlyValidInteractiveVariantsInComponent(
  site: Site,
  component: Component
) {
  const tplMgr = new TplMgr({ site });
  const { invalidVariants } =
    getInvalidInteractiveVariantsInComponent(component);
  tplMgr.tryRemoveVariant(invalidVariants, component);
}
