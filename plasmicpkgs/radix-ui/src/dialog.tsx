// @ts-nocheck
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import clsx from "clsx";

import {
  Animated,
  AnimatedProps,
  animPropTypes,
  EnterAnim,
  ExitAnim,
  popoverProps,
  splitAnimProps,
} from "./util";
import { Side } from "@radix-ui/react-popper";
import { Registerable, registerComponentHelper } from "./reg-util";

export function prefixClasses(x: string) {
  return x
    .trim()
    .split(/\s+/g)
    .map((part) => `plsmc__${part}`)
    .join(" ");
}

const baseSty = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
.absolute {
    position: absolute;
}
.relative {
    position: relative;
}
.transition {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, -webkit-backdrop-filter;
}
.h-full {
    height: 100%;
}
.z-50 { z-index: 50;  }
.fixed { position: fixed; }
.inset-0 { top: 0; left: 0; right: 0; bottom: 0; }
.bottom-0 {
    bottom: 0px;
}
.left-0 {
    left: 0px;
}
.right-0 {
    right: 0px;
}
.top-0 {
    top: 0px;
}
.right-4 {
    right: 1rem;
}
.top-4 {
    top: 1rem;
}
.h-4 { height: 1rem; }
.w-4 { width: 1rem; }
.outline-none { outline: none; }

@keyframes plsmc-enter {

    from {
        opacity: var(--tw-enter-opacity, 1);
        transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0));
    }
}

@keyframes plsmc-exit {

    to {
        opacity: var(--tw-exit-opacity, 1);
        transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0));
    }
}
.data-\\[state\\=open\\]\\:animate-in[data-state=open] {
  animation-name: plsmc-enter;
  animation-duration: 150ms;
  --tw-enter-opacity: initial;
  --tw-enter-scale: initial;
  --tw-enter-rotate: initial;
  --tw-enter-translate-x: initial;
  --tw-enter-translate-y: initial;
}
.data-\\[state\\=closed\\]\\:animate-out[data-state=closed] {
  animation-name: plsmc-exit;
  animation-duration: 150ms;
  --tw-exit-opacity: initial;
  --tw-exit-scale: initial;
  --tw-exit-rotate: initial;
  --tw-exit-translate-x: initial;
  --tw-exit-translate-y: initial;
}
.data-\\[side\\=bottom\\]\\:slide-in-from-top-2[data-side=bottom] {
    --tw-enter-translate-y: -0.5rem;
}

.data-\\[side\\=left\\]\\:slide-in-from-right-2[data-side=left] {
    --tw-enter-translate-x: 0.5rem;
}

.data-\\[side\\=right\\]\\:slide-in-from-left-2[data-side=right] {
    --tw-enter-translate-x: -0.5rem;
}

.data-\\[side\\=top\\]\\:slide-in-from-bottom-2[data-side=top] {
    --tw-enter-translate-y: 0.5rem;
}

`.replace(/\n\./g, ".plsmc__");

export const DialogClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>((props) => (
  <DialogPrimitive.Close {...props}>
    {props.children ?? (
      <X className={prefixClasses("h-4 w-4") + " " + props.className} />
    )}
    <span className="sr-only">Close</span>
  </DialogPrimitive.Close>
));
DialogClose.displayName = DialogPrimitive.Close.displayName;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & AnimatedProps
>(({ className, ...props }, ref) => {
  return (
    <Animated {...props}>
      {(plsmcId) => (
        <DialogPrimitive.Overlay
          className={clsx(
            [
              "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out",
            ].map(prefixClasses),
            plsmcId ? plsmcId : "",
            className
          )}
          {...props}
          ref={ref}
        />
      )}
    </Animated>
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

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
            "fixed z-50 data-[state=open]:animate-in data-[state=closed]:animate-out",
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
DialogContent.displayName = DialogPrimitive.Content.displayName;

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
      {(plsmcId) => (
        <DialogPrimitive.Content
          className={clsx(
            sheetVariants({ side }),
            plsmcId ? plsmcId : "",
            className
          )}
          {...props}
          ref={ref}
        />
      )}
    </Animated>
  );
});
SheetContent.displayName = DialogPrimitive.Content.displayName;

export const sheetVariants = cva(
  prefixClasses(
    "fixed z-50 data-[state=open]:animate-in data-[state=closed]:animate-out"
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
    }
>(
  (
    {
      open,
      onOpenChange,
      modal,
      className,
      themeResetClass,
      children,
      noContain,
      defaultOpen,
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
      <DialogPrimitive.Portal>
        {/*
        The main benefit of containing by default is that users can apply layout to position the dialog content easily, e.g. centered on the screen.

        But still need noContain for Sheets, since they slide in/out, and you don't want them fading in/out just because the overlay is fading out.

        Cannot wrap in any extra divs or exit animations won't work!
        */}
        {noContain ? (
          <>
            <DialogOverlay
              {...props}
              className={clsx(className, themeResetClass)}
            />
            {children}
          </>
        ) : (
          <DialogOverlay
            {...props}
            className={clsx(className, themeResetClass)}
          >
            {children}
          </DialogOverlay>
        )}
      </DialogPrimitive.Portal>
      {/*Must be outside the portal or exit animation doesn't work*/}
      <style>{baseSty}</style>
    </DialogPrimitive.Root>
  )
);

Dialog.displayName = DialogPrimitive.Root.displayName;

export const DialogTitle = DialogPrimitive.Title;

export const DialogDescription = DialogPrimitive.Description;

export function registerDialog(PLASMIC?: Registerable) {
  registerComponentHelper(PLASMIC, Dialog, {
    name: "hostless-radix-dialog",
    displayName: "Dialog",
    importPath: "@plasmicpkgs/radix-ui/dialog",
    importName: "Dialog",
    defaultStyles: {
      // Note: unable to set position styles since Plasmic coerces to auto layout
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(10px)",
      background: "rgba(255,255,255,0.8)",
    },
    props: {
      ...popoverProps,
      noContain: {
        type: "boolean",
        advanced: true,
        description:
          "Place the dialog content over the overlay instead of inside the overlay. Useful for separating their animations, but you also won't be able to conveniently set layout on the overlay as a parent.",
      },
      themeResetClass: { type: "themeResetClass" },
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
  });
  registerComponentHelper(PLASMIC, DialogClose, {
    name: "hostless-radix-dialog-close",
    displayName: "Dialog Close",
    importPath: "@plasmicpkgs/radix-ui/dialog",
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
    importPath: "@plasmicpkgs/radix-ui/dialog",
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
    importPath: "@plasmicpkgs/radix-ui/dialog",
    importName: "DialogContent",
    parentComponentName: "hostless-radix-dialog",
    defaultStyles: {
      // No need for position here, just relying on layout container parent.
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
    importPath: "@plasmicpkgs/radix-ui/dialog",
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
    importPath: "@plasmicpkgs/radix-ui/dialog",
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
