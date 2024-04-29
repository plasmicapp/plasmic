import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import clsx from "clsx";
import { Registerable, registerComponentHelper } from "./reg-util";
import {
  Animated,
  BaseStyles,
  overlayProps,
  overlayStates,
  PopoverExtraProps,
  popoverProps,
  prefixClasses,
  splitAnimProps,
  wrapFragmentInDiv,
} from "./util";

export function Popover({
  // root
  open,
  onOpenChange,
  defaultOpen,
  modal,

  // content
  className,
  sideOffset = 4,
  themeResetClass,
  overlay,
  slideIn = true,

  // trigger/anchor
  trigger = true,
  children,

  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> &
  PopoverPrimitive.PopoverProps &
  PopoverExtraProps & {
    trigger?: boolean;
  }) {
  const [animProps, rest] = splitAnimProps(props);
  return (
    <Animated
      enterAnimations={["fade-in", "zoom-enter"]}
      exitAnimations={["fade-out", "zoom-exit"]}
      {...animProps}
    >
      {(dynClass) => (
        <PopoverPrimitive.Root
          open={open}
          onOpenChange={onOpenChange}
          defaultOpen={defaultOpen}
          modal={modal}
        >
          {trigger ? (
            <PopoverPrimitive.Trigger asChild>
              {wrapFragmentInDiv(children, className)}
            </PopoverPrimitive.Trigger>
          ) : (
            <PopoverPrimitive.Anchor asChild>
              {wrapFragmentInDiv(children, className)}
            </PopoverPrimitive.Anchor>
          )}
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              className={clsx(
                prefixClasses(
                  "outline-none z-50 data-[state=open]:animate-in data-[state=closed]:animate-out"
                ),
                slideIn
                  ? prefixClasses(
                      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                    )
                  : "",
                dynClass ? dynClass : "",
                themeResetClass
              )}
              sideOffset={sideOffset}
              {...rest}
            >
              {overlay}
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
          <BaseStyles />
        </PopoverPrimitive.Root>
      )}
    </Animated>
  );
}
Popover.displayName = "PlasmicRadixPopover";

export function registerPopover(PLASMIC?: Registerable) {
  registerComponentHelper(PLASMIC, Popover, {
    name: "hostless-radix-popover",
    displayName: "Popover Core",
    importPath: "@plasmicpkgs/radix-ui",
    importName: "Popover",
    states: overlayStates,
    props: {
      ...overlayProps({
        triggerSlotName: "children",
        defaultSlotContent: {
          type: "default-component",
          kind: "button",
          props: {
            children: { type: "text", value: `Show popover` },
          },
        },
      }),
      trigger: {
        type: "boolean",
        displayName: "Trigger on click",
        defaultValueHint: true,
        description:
          `Instead of automatically showing the popover on click, ` +
          `you can toggle the popover's "open" state from any interaction. ` +
          `This enables more custom control over when it is shown.`,
        advanced: true,
      },
      ...popoverProps,
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
          children: ["Here is the popover content."],
        },
        ...({
          mergeWithParent: true,
        } as any),
      },
    },
  });
}
