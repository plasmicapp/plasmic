import React from "react";
import type {
  OverlayArrowProps,
  OverlayArrowRenderProps,
} from "react-aria-components";
import {
  OverlayArrow,
  PopoverContext,
  TooltipTriggerStateContext,
} from "react-aria-components";
import { COMMON_STYLES, arrowDown, createIdProp } from "./common";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import {
  VariantUpdater,
  WithVariants,
  pickAriaComponentVariants,
} from "./variant-utils";

const OVERLAY_ARROW_VARIANTS = [
  // We do not offer a placementDown variant, because that's the default placement (an overlay arrow always has [data-placement=bottom] if it's not explicitly set)
  "placementTop" as const,
  "placementLeft" as const,
  "placementRight" as const,
];

export interface BaseOverlayArrowProps
  extends OverlayArrowProps,
    WithVariants<typeof OVERLAY_ARROW_VARIANTS> {
  children: React.ReactNode;
  className?: string;
}

const { variants } = pickAriaComponentVariants(OVERLAY_ARROW_VARIANTS);

export function BaseOverlayArrow({
  children,
  plasmicUpdateVariant,
  className,
  id,
}: BaseOverlayArrowProps) {
  const popoverContext = React.useContext(PopoverContext);
  const tooltipContext = React.useContext(TooltipTriggerStateContext);
  const isStandalone = !popoverContext && !tooltipContext; // i.e. without a trigger to point to
  const overlayArrow = (
    <OverlayArrow
      className={className}
      id={id}
      style={{ lineHeight: "0", ...COMMON_STYLES }}
    >
      {({ placement }: OverlayArrowRenderProps) => (
        <>
          <VariantUpdater
            changes={{
              placementTop: placement === "top",
              placementLeft: placement === "left",
              placementRight: placement === "right",
            }}
            updateVariant={plasmicUpdateVariant}
          />
          {children}
        </>
      )}
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
      styleSections: ["visibility"],
      variants,
      props: {
        id: createIdProp("Overlay Arrow"),
        children: {
          type: "slot",
          defaultValue: arrowDown,
        },
      },
    },
    overrides
  );
}
