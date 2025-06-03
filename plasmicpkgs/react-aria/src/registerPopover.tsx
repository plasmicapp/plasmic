import { usePlasmicCanvasContext } from "@plasmicapp/host";
import { mergeProps } from "@react-aria/utils";
import React, { useEffect } from "react";
import { Popover, PopoverContext } from "react-aria-components";
import { COMMON_STYLES, getCommonOverlayProps } from "./common";
import { PlasmicPopoverTriggerContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
export interface BasePopoverControlContextData {
  canMatchTriggerWidth?: boolean;
}
export interface BasePopoverProps
  extends React.ComponentProps<typeof Popover>,
    HasControlContextData<BasePopoverControlContextData> {
  className?: string;
  resetClassName?: string;
  children?: React.ReactNode;
  matchTriggerWidth?: boolean;
}

// PopoverContext is used by BasePopover and BaseOverlayArrow
export function BasePopover(props: BasePopoverProps) {
  const {
    resetClassName,
    setControlContextData,
    matchTriggerWidth,
    ...restProps
  } = props;
  // Popover can be inside DialogTrigger, Select, Combobox, etc. So we can't just use a particular context like DialogTrigger (like we do in Modal) to decide if it is standalone
  const isStandalone = !React.useContext(PopoverContext);
  const hasTrigger = !!React.useContext(PlasmicPopoverTriggerContext);
  const triggerRef = React.useRef<any>(null);
  const canvasContext = usePlasmicCanvasContext();
  const matchTriggerWidthProp = hasTrigger && matchTriggerWidth;

  /*
    We only want to trap focus if:
   1. The popover is NOT in canvas (because while the dialog is open on the canvas, the focus is trapped inside it, so any Studio modals like the Color Picker modal would glitch due to focus jumping back and forth)
   2. The popover is NOT standalone or inside a Select/Combobox (focus trapping is already handled in Select/Combobox). A way to identify this is by the presence of a DialogTrigger context.
 */
  const { children, ...mergedProps } = mergeProps(
    canvasContext && !canvasContext.interactive
      ? {
          // isNonModal: Whether the popover is non-modal, i.e. elements outside the popover may be interacted with by assistive technologies.
          // Setting isNonModal to true in edit mode (canvas) means that the popover will not prevent the user from interacting with the canvas while the popover is open.
          isNonModal: true,
        }
      : undefined,
    restProps,
    { className: `${resetClassName}` },
    // Override some props if the popover is standalone
    isStandalone
      ? {
          triggerRef,
          isNonModal: true,
          // Always true, because we assume that popover is always going to be controlled by a parent like Select, Combobox, DialogTrigger, etc, and its only really standalone in component view
          // In component view, we never want to start with an empty artboard, so isOpen has to be true
          isOpen: true,
        }
      : null
  );

  useEffect(() => {
    setControlContextData?.({
      canMatchTriggerWidth: hasTrigger,
    });
  }, [hasTrigger, setControlContextData]);

  return (
    <>
      {isStandalone && <div ref={triggerRef} />}
      <Popover
        // more about `--trigger-width` here: https://react-spectrum.adobe.com/react-aria/Select.html#popover-1
        style={{
          ...(matchTriggerWidthProp ? { width: `var(--trigger-width)` } : {}),
          ...COMMON_STYLES,
        }}
        {...mergedProps}
      >
        {children}
      </Popover>
    </>
  );
}

export const POPOVER_COMPONENT_NAME = makeComponentName("popover");

export function registerPopover(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BasePopover>
) {
  registerComponentHelper(
    loader,
    BasePopover,
    {
      name: POPOVER_COMPONENT_NAME,
      displayName: "Aria Popover",
      importPath: "@plasmicpkgs/react-aria/skinny/registerPopover",
      importName: "BasePopover",
      defaultStyles: {
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "black",
        width: "300px",
        backgroundColor: "#FDE3C3",
      },
      props: {
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: [
            {
              type: "vbox",
              styles: {
                width: "stretch",
                padding: "20px",
                rowGap: "10px",
              },
              children: [
                {
                  type: "text",
                  value: "This is a Popover!",
                },
                {
                  type: "text",
                  value: "You can put anything you can imagine here!",
                  styles: {
                    fontWeight: 500,
                  },
                },
                {
                  type: "text",
                  value:
                    "Use it in a `Aria Dialog Trigger` component to trigger it on a button click!",
                },
              ],
            },
          ],
        },
        shouldFlip: {
          type: "boolean",
          description:
            "Whether the element should flip its orientation (e.g. top to bottom or left to right) when there is insufficient room for it to render completely.",
          defaultValueHint: true,
        },

        resetClassName: {
          type: "themeResetClass",
        },
        matchTriggerWidth: {
          type: "boolean",
          defaultValue: true,
          hidden: (_props, ctx) => !ctx?.canMatchTriggerWidth,
        },
        ...getCommonOverlayProps<BasePopoverProps>("popover", {
          placement: { defaultValueHint: "bottom" },
          offset: { defaultValueHint: 8 },
          containerPadding: { defaultValueHint: 12 },
          crossOffset: { defaultValueHint: 0 },
        }),
      },
      // No isOpen state for popover, because we assume that its open state is always going to be controlled by a parent like Select, Combobox, DialogTrigger, etc.
      styleSections: true,
      trapsFocus: true,
    },
    overrides
  );
}
