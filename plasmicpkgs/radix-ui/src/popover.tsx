// @ts-nocheck
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import clsx from "clsx";
import { ReactNode } from "react";
import {
  Animated,
  AnimatedProps,
  animPropTypes,
  popoverProps,
  splitAnimProps,
} from "./util";
import { Registerable, registerComponentHelper } from "./reg-util";

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
  AnimatedProps &
  PopoverPrimitive.PopoverProps & {
    themeResetClass?: string;
    overlay?: ReactNode;
    trigger?: boolean;
    slideIn?: boolean;
  }) {
  const [animProps, rest] = splitAnimProps(props);
  return (
    <Animated
      enterAnimations={["fade-in", "zoom-enter"]}
      exitAnimations={["fade-out", "zoom-exit"]}
      {...animProps}
    >
      {(plsmcId) => (
        <PopoverPrimitive.Root
          open={open}
          onOpenChange={onOpenChange}
          defaultOpen={defaultOpen}
          modal={modal}
        >
          {trigger ? (
            <PopoverPrimitive.Trigger>{children}</PopoverPrimitive.Trigger>
          ) : (
            <PopoverPrimitive.Anchor>{children}</PopoverPrimitive.Anchor>
          )}
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              className={clsx(
                "outline-none data-[state=open]:animate-in data-[state=closed]:animate-out",
                slideIn
                  ? "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                  : "",
                plsmcId ? plsmcId : "",
                className,
                themeResetClass
              )}
              sideOffset={sideOffset}
              {...rest}
            >
              {overlay}
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      )}
    </Animated>
  );
}
Popover.displayName = PopoverPrimitive.Content.displayName;

export function registerPopover(PLASMIC?: Registerable) {
  registerComponentHelper(PLASMIC, Popover, {
    name: "hostless-radix-popover",
    displayName: "Popover",
    importPath: "@plasmicpkgs/radix-ui/popover",
    importName: "Popover",
    props: {
      ...popoverProps,
      trigger: {
        type: "boolean",
        displayName: "Trigger on click",
        defaultValueHint: true,
        advanced: true,
      },
      themeResetClass: { type: "themeResetClass" },
      side: {
        type: "choice",
        options: ["top", "bottom", "left", "right"],
        defaultValueHint: "bottom",
      },
      sideOffset: {
        type: "number",
        defaultValueHint: 4,
        advanced: true,
      },
      align: {
        type: "choice",
        options: ["center", "start", "end"],
        defaultValueHint: "center",
      },
      alignOffset: {
        type: "number",
        defaultValueHint: 0,
        advanced: true,
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
          children: ["Hello World"],
        },
        ...({
          mergeWithParent: true,
        } as any),
      },
      children: {
        type: "slot",
        defaultValue: ["Popover here"],
        ...({
          mergeWithParent: true,
        } as any),
      },
      ...animPropTypes({
        defaultEnterAnimations: () => ["fade-in", "zoom-enter"],
        defaultExitAnimations: () => ["fade-out", "zoom-exit"],
      }),
      slideIn: {
        type: "boolean",
        defaultValueHint: true,
        description:
          "Add additional subtle slide-in animation on reveal, which can depend on where the popover is dynamically placed.",
      },
    },
  });
}
