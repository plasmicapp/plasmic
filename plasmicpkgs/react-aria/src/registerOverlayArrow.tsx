import React from "react";
import type {
  OverlayArrowProps,
  OverlayArrowRenderProps,
} from "react-aria-components";
import {
  OverlayArrow,
  PopoverContext,
  TooltipContext,
} from "react-aria-components";
import { arrowDown, COMMON_STYLES } from "./common";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

const OVERLAY_ARROW_VARIANTS = [
  // We do not offer a placementDown variant, because that's the default placement (an overlay arrow always has [data-placement=bottom] if it's not explicitly set)
  "placementTop" as const,
  "placementLeft" as const,
  "placementRight" as const,
];

export interface BaseOverlayArrowProps
  extends OverlayArrowProps,
    WithVariants<typeof OVERLAY_ARROW_VARIANTS> {}

const { variants, withObservedValues } = pickAriaComponentVariants(
  OVERLAY_ARROW_VARIANTS
);

export function BaseOverlayArrow({
  children,
  plasmicUpdateVariant,
  className,
}: BaseOverlayArrowProps) {
  const popoverContext = React.useContext(PopoverContext);
  const tooltipContext = React.useContext(TooltipContext);
  const isStandalone = !popoverContext && !tooltipContext; // i.e. without a trigger to point to
  const overlayArrow = (
    <OverlayArrow
      style={{ lineHeight: "0", ...COMMON_STYLES }}
      className={className}
    >
      {({ placement }: OverlayArrowRenderProps) =>
        withObservedValues(
          <>{children}</>,
          {
            placementTop: placement === "top",
            placementLeft: placement === "left",
            placementRight: placement === "right",
          },
          plasmicUpdateVariant
        )
      }
    </OverlayArrow>
  );
  if (isStandalone) {
    return <div style={{ position: "relative" }}>{overlayArrow}</div>;
  }
  return overlayArrow;
}

export const OVERLAY_ARROW_COMPONENT_NAME = makeComponentName("overlayArrow");

export function registerOverlayArrow(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseOverlayArrow>
) {
  return registerComponentHelper(
    loader,
    BaseOverlayArrow,
    {
      name: OVERLAY_ARROW_COMPONENT_NAME,
      displayName: "Aria Overlay Arrow",
      importPath: "@plasmicpkgs/react-aria/skinny/registerOverlayArrow",
      importName: "BaseOverlayArrow",
      styleSections: false,
      variants,
      props: {
        children: {
          type: "slot",
          defaultValue: arrowDown,
        },
      },
    },
    overrides
  );
}
