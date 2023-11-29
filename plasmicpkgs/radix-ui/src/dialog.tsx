import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import clsx from "clsx";

import { Side } from "@radix-ui/react-popper";
import { Registerable, registerComponentHelper } from "./reg-util";
import {
  Animated,
  AnimatedProps,
  animPropTypes,
  BaseStyles,
  EnterAnim,
  ExitAnim,
  overlayProps,
  overlayStates,
  prefixClasses,
  splitAnimProps,
  wrapFragmentInDiv,
} from "./util";

export const DialogClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>((props) => (
  <DialogPrimitive.Close {...props} asChild>
    <div className={props.className}>
      {props.children ?? <X className={prefixClasses("h-4 w-4")} />}
      <span className={prefixClasses("sr-only")}>Close</span>
    </div>
  </DialogPrimitive.Close>
));
DialogClose.displayName = "PlasmicRadixDialogClose";

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & AnimatedProps
>(({ className, ...props }, ref) => {
  return (
    <Animated {...props}>
      {(dynClass) => (
        <DialogPrimitive.Overlay
          className={clsx(
            [
              "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out",
            ].map(prefixClasses),
            dynClass ? dynClass : "",
            className
          )}
          {...props}
          ref={ref}
        />
      )}
    </Animated>
  );
});
DialogOverlay.displayName = "PlasmicOverlay";

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  { themeResetClass?: string } & React.ComponentPropsWithoutRef<
    typeof DialogPrimitive.Content
  > &
    AnimatedProps
>(({ className, themeResetClass, ...props }, ref) => {
  const [animProps, rest] = splitAnimProps(props);

  return (
    <Animated
      {...animProps}
      enterAnimations={animProps.enterAnimations ?? ["zoom-enter", "fade-in"]}
      exitAnimations={animProps.exitAnimations ?? ["zoom-exit", "fade-out"]}
    >
      {(dynClass) => (
        <DialogPrimitive.Content
          {...rest}
          className={clsx(
            prefixClasses(
              "fixed z-50 outline-none relative box-border data-[state=open]:animate-in data-[state=closed]:animate-out"
            ),
            dynClass ? dynClass : "",
            themeResetClass,
            className
          )}
          ref={ref}
        />
      )}
    </Animated>
  );
});
DialogContent.displayName = "PlasmicRadixDialogContent";

function getDefaultSheetAnims(side: Side = "right") {
  return (
    {
      right: ["slide-in-from-right", "slide-out-to-right"],
      bottom: ["slide-in-from-bottom", "slide-out-to-bottom"],
      left: ["slide-in-from-left", "slide-out-to-left"],
      top: ["slide-in-from-top", "slide-out-to-top"],
    } as Record<Side, [EnterAnim, ExitAnim]>
  )[side];
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    AnimatedProps & { themeResetClass?: string } & VariantProps<
      typeof sheetVariants
    >
>(({ className, themeResetClass, side = "right", ...props }, ref) => {
  const [defaultEnterAnimation, defaultExitAnimation] = getDefaultSheetAnims(
    side ?? "right"
  );
  return (
    <Animated
      {...props}
      enterAnimations={props.enterAnimations ?? [defaultEnterAnimation]}
      exitAnimations={props.exitAnimations ?? [defaultExitAnimation]}
    >
      {(dynClass) => (
        <DialogPrimitive.Content
          className={clsx(
            sheetVariants({ side }),
            dynClass ? dynClass : "",
            themeResetClass,
            className
          )}
          {...props}
          ref={ref}
        />
      )}
    </Animated>
  );
});
SheetContent.displayName = "PlasmicRadixSheetContent";

export const sheetVariants = cva(
  prefixClasses(
    "fixed z-50 outline-none relative data-[state=open]:animate-in data-[state=closed]:animate-out"
  ),
  {
    variants: {
      side: {
        top: prefixClasses("inset-x-0 top-0"),
        bottom: prefixClasses("inset-x-0 bottom-0"),
        left: prefixClasses("inset-y-0 left-0 h-full"),
        right: prefixClasses("inset-y-0 right-0 h-full"),
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

export const Dialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Root> & AnimatedProps,
  DialogPrimitive.DialogProps &
    DialogPrimitive.DialogOverlayProps & {
      overlayClassName?: string;
      themeResetClass?: string;
      noContain?: boolean;
      triggerSlot?: React.ReactNode;
    }
>(
  (
    {
      open,
      onOpenChange,
      modal,
      themeResetClass,
      children,
      noContain,
      defaultOpen,
      triggerSlot,
      overlayClassName,
      ...props
    },
    ref
  ) => (
    <DialogPrimitive.Root
      open={open}
      modal={modal}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
    >
      <DialogPrimitive.Trigger asChild>
        {wrapFragmentInDiv(triggerSlot)}
      </DialogPrimitive.Trigger>
      {/*
      The main benefit of containing by default is that users can apply layout to position the dialog content easily, e.g. centered on the screen.

      But still need noContain for Sheets, since they slide in/out, and you don't want them fading in/out just because the overlay is fading out.

      ALSO, Portal needs to know the exit animation state, and to do this it needs DialogOverlay and the content (children) to both be immediate children - they can't be inside a React.Fragment, and of course cannot wrap in any extra divs!
      */}
      {noContain ? (
        <>
          <DialogPrimitive.Portal>
            <DialogOverlay
              ref={ref}
              {...props}
              className={clsx(overlayClassName, themeResetClass)}
            />
            {children}
          </DialogPrimitive.Portal>
        </>
      ) : (
        <DialogPrimitive.Portal>
          <DialogOverlay
            ref={ref}
            {...props}
            className={clsx(overlayClassName, themeResetClass)}
          >
            {children}
          </DialogOverlay>
        </DialogPrimitive.Portal>
      )}
      {/*Must be outside the portal or exit animation doesn't work*/}
      <BaseStyles />
    </DialogPrimitive.Root>
  )
);

Dialog.displayName = "PlasmicRadixDialog";

export const DialogTitle = DialogPrimitive.Title;

export const DialogDescription = DialogPrimitive.Description;

export function registerDialog(PLASMIC?: Registerable) {
  registerComponentHelper(PLASMIC, Dialog, {
    name: "hostless-radix-dialog",
    displayName: "Dialog Core",
    importPath: "@plasmicpkgs/radix-ui",
    importName: "Dialog",
    styleSections: false,
    defaultStyles: {
      // Note: unable to set position styles since Plasmic coerces to auto layout
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(10px)",
      background: "rgba(255,255,255,0.8)",
    },
    props: {
      ...overlayProps({
        defaultSlotContent: {
          type: "default-component",
          kind: "button",
          props: {
            children: { type: "text", value: `Show dialog` },
          },
        },
        triggerSlotName: "triggerSlot",
      }),
      overlayClassName: {
        type: "class",
      },
      noContain: {
        type: "boolean",
        advanced: true,
        description:
          "Place the dialog content over the overlay instead of inside the overlay. Useful for separating their animations, but you also won't be able to conveniently set layout on the overlay as a parent.",
      },
      children: {
        type: "slot",
        allowedComponents: [
          "hostless-radix-sheet-content",
          "hostless-radix-dialog-content",
        ],
        defaultValue: {
          type: "component",
          name: "hostless-radix-dialog-content",
        },
      },
    },
    states: overlayStates,
  });
  registerComponentHelper(PLASMIC, DialogClose, {
    name: "hostless-radix-dialog-close",
    displayName: "Dialog Close",
    importPath: "@plasmicpkgs/radix-ui",
    importName: "DialogClose",
    parentComponentName: "hostless-radix-dialog",
    defaultStyles: {
      position: "absolute",
      top: "16px",
      right: "16px",
      opacity: "0.7",
      borderRadius: "999px",
    },
    props: {
      children: {
        type: "slot",
        hidePlaceholder: true,
      },
    },
  });
  const dialogStyles = {
    width: "400px",
    maxWidth: "100%",
    background: "rgb(255,255,255)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#E2E8F0",
    boxShadow: "0px 4px 16px 0px #00000033",
  };
  registerComponentHelper(PLASMIC, SheetContent, {
    name: "hostless-radix-sheet-content",
    displayName: "Drawer Content",
    importPath: "@plasmicpkgs/radix-ui",
    importName: "SheetContent",
    parentComponentName: "hostless-radix-dialog",
    defaultStyles: {
      // Positions can sometimes take effect since these can be implicitly inserted as children of other default content, thus escaping Plasmic's layout coersion.
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      padding: "16px",
      ...dialogStyles,
    },
    props: {
      side: {
        type: "choice",
        options: ["right", "bottom", "left", "top"],
        defaultValueHint: "right",
      },
      themeResetClass: { type: "themeResetClass" },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "vbox",
            styles: {
              alignItems: "stretch",
              gap: "8px",
            },
            children: [
              {
                type: "component",
                name: "hostless-radix-dialog-title",
              },
              {
                type: "component",
                name: "hostless-radix-dialog-description",
              },
            ],
          },
          {
            type: "component",
            name: "hostless-radix-dialog-close",
          },
        ],
      },
      ...animPropTypes({
        defaultEnterAnimations: (ps) => [getDefaultSheetAnims(ps.side)[0]],
        defaultExitAnimations: (ps) => [getDefaultSheetAnims(ps.side)[1]],
      }),
    },
  });
  registerComponentHelper(PLASMIC, DialogContent, {
    name: "hostless-radix-dialog-content",
    displayName: "Dialog Content",
    importPath: "@plasmicpkgs/radix-ui",
    importName: "DialogContent",
    parentComponentName: "hostless-radix-dialog",
    defaultStyles: {
      // No need for position here, just relying on layout container parent.
      position: "relative",
      margin: "10% auto", // for horizontally centered dialog
      padding: "24px",
      borderRadius: "8px",
      ...dialogStyles,
    },
    props: {
      themeResetClass: { type: "themeResetClass" },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "vbox",
            styles: {
              alignItems: "stretch",
              gap: "8px",
            },
            children: [
              {
                type: "component",
                name: "hostless-radix-dialog-title",
              },
              {
                type: "component",
                name: "hostless-radix-dialog-description",
              },
            ],
          },
          {
            type: "component",
            name: "hostless-radix-dialog-close",
          },
        ],
      },
      ...animPropTypes({
        defaultEnterAnimations: () => ["zoom-enter", "fade-in"],
        defaultExitAnimations: () => ["zoom-exit", "fade-out"],
      }),
    },
  });
  registerComponentHelper(PLASMIC, DialogTitle, {
    name: "hostless-radix-dialog-title",
    displayName: "Dialog Title",
    importPath: "@plasmicpkgs/radix-ui",
    importName: "DialogTitle",
    parentComponentName: "hostless-radix-dialog",
    props: {
      children: {
        type: "slot",
        defaultValue: "Sheet title",
      },
    },
  });
  registerComponentHelper(PLASMIC, DialogDescription, {
    name: "hostless-radix-dialog-description",
    displayName: "Dialog Description",
    importPath: "@plasmicpkgs/radix-ui",
    importName: "DialogDescription",
    parentComponentName: "hostless-radix-dialog",
    props: {
      children: {
        type: "slot",
        defaultValue: "Sheet description",
      },
    },
  });
}
