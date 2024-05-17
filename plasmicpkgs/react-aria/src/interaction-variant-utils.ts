import { CodeComponentMeta } from "@plasmicapp/host";
import React from "react";

const ARIA_COMPONENTS_INTERACTION_VARIANTS = {
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
};

type AriaInteractionVariant = keyof typeof ARIA_COMPONENTS_INTERACTION_VARIANTS;

type CodeComponentInteractionVariantsMeta = NonNullable<
  CodeComponentMeta<unknown>["interactionVariants"]
>;

type InteractionVariantMeta = CodeComponentInteractionVariantsMeta[string];

type ArrayElement<T> = T extends (infer U)[] ? U : never;

export type UpdateInteractionVariant<T extends AriaInteractionVariant[]> =
  | ((changes: Partial<Record<ArrayElement<T>, boolean>>) => void)
  | undefined;

type WithObservedValues<T extends AriaInteractionVariant[]> = (
  children: React.ReactNode,
  state: Record<ArrayElement<T>, boolean>,
  updateInteractionVariant: UpdateInteractionVariant<T>
) => React.ReactNode;

function realWithObservedValues<T extends AriaInteractionVariant[]>(
  children: React.ReactNode,
  changes: Partial<Record<ArrayElement<T>, boolean>>,
  updateInteractionVariant?: UpdateInteractionVariant<T>
) {
  React.useEffect(() => {
    if (updateInteractionVariant) {
      updateInteractionVariant(changes);
    }
  }, [changes, updateInteractionVariant]);
  return children;
}

export function pickAriaComponentVariants<T extends AriaInteractionVariant[]>(
  keys: T
): {
  interactionVariants: Record<ArrayElement<T>, InteractionVariantMeta>;
  withObservedValues: WithObservedValues<T>;
} {
  return {
    interactionVariants: Object.fromEntries(
      keys.map((key) => [key, ARIA_COMPONENTS_INTERACTION_VARIANTS[key]])
    ) as Record<ArrayElement<T>, InteractionVariantMeta>,
    withObservedValues: realWithObservedValues<T>,
  };
}
