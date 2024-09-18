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

type WithObservedValues<T extends AriaVariant[]> = (
  children: React.ReactNode,
  state: Record<ArrayElement<T>, boolean>,
  updateVariant: UpdateVariant<T>
) => React.ReactNode;

function ChangesObserver<T extends AriaVariant[]>({
  children,
  changes,
  updateVariant,
}: {
  children: React.ReactNode;
  changes: Partial<Record<ArrayElement<T>, boolean>>;
  updateVariant?: UpdateVariant<T>;
}) {
  React.useEffect(() => {
    if (updateVariant) {
      updateVariant(changes);
    }
  }, [changes, updateVariant]);
  return children;
}

function realWithObservedValues<T extends AriaVariant[]>(
  children: React.ReactNode,
  changes: Partial<Record<ArrayElement<T>, boolean>>,
  updateVariant?: UpdateVariant<T>
) {
  return (
    <ChangesObserver changes={changes} updateVariant={updateVariant}>
      {children}
    </ChangesObserver>
  );
}

export function pickAriaComponentVariants<T extends AriaVariant[]>(
  keys: T
): {
  variants: Record<ArrayElement<T>, VariantMeta>;
  withObservedValues: WithObservedValues<T>;
} {
  return {
    variants: Object.fromEntries(
      keys.map((key) => [key, ARIA_COMPONENTS_VARIANTS[key]])
    ) as Record<ArrayElement<T>, VariantMeta>,
    withObservedValues: realWithObservedValues<T>,
  };
}
