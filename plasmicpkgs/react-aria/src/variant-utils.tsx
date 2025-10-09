import { CodeComponentMeta } from "@plasmicapp/host";
import React from "react";

const ARIA_COMPONENTS_VARIANTS = {
  hovered: {
    cssSelector: "[data-hovered]",
    displayName: "Hovered",
  },
  pressed: {
    cssSelector: "[data-pressed]",
    displayName: "Pressed",
  },
  focused: {
    cssSelector: "[data-focused]",
    displayName: "Focused",
  },
  focusVisible: {
    cssSelector: "[data-focus-visible]",
    displayName: "Focus Visible",
  },
  dragging: {
    cssSelector: "[data-dragging]",
    displayName: "Dragging",
  },
  selected: {
    cssSelector: "[data-selected]",
    displayName: "Selected",
  },
  readonly: {
    cssSelector: "[data-readonly]",
    displayName: "Read Only",
  },
  disabled: {
    cssSelector: "[data-disabled]",
    displayName: "Disabled",
  },
  indeterminate: {
    cssSelector: "[data-indeterminate]",
    displayName: "Indeterminate",
  },
  /*
    NOTE: Placement should be managed as variants, not just props.
    When `shouldFlip` is true, the placement prop may not represent the final position
    (e.g., if placement is set to "bottom" but lacks space, the popover/tooltip may flip to "top").
    However, data-selectors will consistently indicate the actual placement of the popover/tooltip.
  */
  placementLeft: {
    cssSelector: "[data-placement=left]",
    displayName: "Placement (Left)",
  },
  placementRight: {
    cssSelector: "[data-placement=right]",
    displayName: "Placement (Right)",
  },
  placementTop: {
    cssSelector: "[data-placement=top]",
    displayName: "Placement (Top)",
  },
  placementBottom: {
    cssSelector: "[data-placement=bottom]",
    displayName: "Placement (Bottom)",
  },
};

type AriaVariant = keyof typeof ARIA_COMPONENTS_VARIANTS;

type CodeComponentVariantsMeta = NonNullable<
  CodeComponentMeta<unknown>["variants"]
>;

type VariantMeta = CodeComponentVariantsMeta[string];

type ArrayElement<T> = T extends (infer U)[] ? U : never;

export type UpdateVariant<T extends AriaVariant[]> =
  | ((changes: Partial<Record<ArrayElement<T>, boolean>>) => void)
  | undefined;

export interface WithVariants<T extends AriaVariant[]> {
  // Optional callback to update the CC variant state
  // as it's only provided if the component is the root of a Studio component
  plasmicUpdateVariant?: UpdateVariant<T>;
}

export function VariantUpdater<T extends AriaVariant[]>({
  changes,
  updateVariant,
}: {
  changes: Partial<Record<ArrayElement<T>, boolean>>;
  updateVariant?: UpdateVariant<T>;
}) {
  React.useEffect(() => {
    if (updateVariant) {
      updateVariant(changes);
    }
  }, [changes, updateVariant]);
  return null;
}

export function pickAriaComponentVariants<T extends AriaVariant[]>(
  keys: T
): {
  variants: Record<ArrayElement<T>, VariantMeta>;
} {
  return {
    variants: Object.fromEntries(
      keys.map((key) => [key, ARIA_COMPONENTS_VARIANTS[key]])
    ) as Record<ArrayElement<T>, VariantMeta>,
  };
}
