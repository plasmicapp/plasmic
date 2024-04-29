import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import clsx from "clsx";
import * as React from "react";
import { Registerable, registerComponentHelper } from "./reg-util";
import {
  Animated,
  BaseStyles,
  overlayProps,
  PopoverExtraProps,
  popoverProps,
  prefixClasses,
  splitAnimProps,
  wrapFragmentInDiv,
} from "./util";

export const Tooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
    TooltipPrimitive.TooltipProps &
    PopoverExtraProps
>(
  (
    {
      // content & custom
      className,
      sideOffset = 4,
      themeResetClass,
      slideIn = true,
      overlay,

      // root
      delayDuration,
      disableHoverableContent,
      open,
      onOpenChange,
      defaultOpen,

      // trigger/anchor
      children,

      ...props
    },
    ref
  ) => {
    const [animProps, rest] = splitAnimProps(props);
    return (
      <Animated
        enterAnimations={["fade-in", "zoom-enter"]}
        exitAnimations={["fade-out", "zoom-exit"]}
        {...animProps}
      >
        {(dynClass) => (
          <TooltipPrimitive.Provider>
            <TooltipPrimitive.Root
              {...{
                delayDuration,
                disableHoverableContent,
                open,
                onOpenChange,
                defaultOpen,
              }}
            >
              <TooltipPrimitive.Trigger asChild>
                {wrapFragmentInDiv(children, className)}
              </TooltipPrimitive.Trigger>
              <TooltipPrimitive.Content
                ref={ref}
                sideOffset={sideOffset}
                className={clsx(
                  prefixClasses(
                    "z-50 animate-in data-[state=closed]:animate-out"
                  ),
                  slideIn
                    ? prefixClasses(
                        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                      )
                    : "",
                  dynClass ? dynClass : "",
                  themeResetClass
                )}
                {...rest}
              >
                {overlay}
              </TooltipPrimitive.Content>
              <BaseStyles />
            </TooltipPrimitive.Root>
          </TooltipPrimitive.Provider>
        )}
      </Animated>
    );
  }
);
Tooltip.displayName = "PlasmicRadixTooltip";

export function registerTooltip(PLASMIC?: Registerable) {
  registerComponentHelper(PLASMIC, Tooltip, {
    name: "hostless-radix-tooltip",
    displayName: "Tooltip Core",
    importPath: "@plasmicpkgs/radix-ui",
    importName: "Tooltip",
    props: {
      ...overlayProps({
        triggerSlotName: "children",
        defaultSlotContent: { type: "text", value: "I have a tooltip." },
        openDisplay: "Preview open",
      }),
      ...{
        ...popoverProps,
        side: {
          ...popoverProps.side,
          defaultValueHint: "top",
        },
        delayDuration: {
          type: "number",
          defaultValueHint: 700,
        },
      },
      overlay: {
        type: "slot",
        defaultValue: {
          type: "vbox",
          styles: {
            padding: "16px",
            width: "300px",
            maxWidth: "100%",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "#E2E8F0",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0px 4px 16px 0px #00000033",
            alignItems: "stretch",
          },
          children: ["Here is the tooltip content."],
        },
        ...({
          mergeWithParent: true,
        } as any),
      },
    },
  });
}
