import { PlasmicElement, usePlasmicCanvasContext } from "@plasmicapp/host";
import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Popover, PopoverContext } from "react-aria-components";
import { PlasmicPopoverContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface PopoverControlContextData {
  defaultShouldFlip?: boolean;
}

export interface BasePopoverProps
  extends React.ComponentProps<typeof Popover>,
    HasControlContextData<PopoverControlContextData> {
  className?: string;
  resetClassName?: string;
  defaultShouldFlip?: boolean;
}

export function BasePopover(props: BasePopoverProps) {
  const { resetClassName, setControlContextData, ...restProps } = props;
  // Popover can be inside DialogTrigger, Select, Combobox, etc. So we can't just use a particular context like DialogTrigger (like we do in Modal) to decide if it is standalone
  const isStandalone = !React.useContext(PopoverContext);
  const context = React.useContext(PlasmicPopoverContext);
  const triggerRef = React.useRef<any>(null);
  const isEditMode = !!usePlasmicCanvasContext();

  const mergedProps = mergeProps(
    {
      isOpen: context?.isOpen,
      shouldFlip: context?.defaultShouldFlip,
    },
    /**
     * isNonModal: Whether the popover is non-modal, i.e. elements outside the popover may be interacted with by assistive technologies. *
     *
     * Setting isNonModal to true in edit mode (canvas) means that the popover will not prevent the user from interacting with the canvas while the popover is open.
     */
    isEditMode ? { isNonModal: true } : null,
    restProps,
    { className: `${resetClassName}` },
    // Override some props if the popover is standalone
    isStandalone
      ? {
          triggerRef,
          isNonModal: true,
          /**
           * Always true, because we assume that popover is always going to be controlled by a parent like Select, Combobox, DialogTrigger, etc, and its only really standalone in component view
           * In component view, we never want to start with an empty artboard, so isOpen has to be true
           *  */

          isOpen: true,
        }
      : null
  );

  setControlContextData?.({
    defaultShouldFlip: context?.defaultShouldFlip ?? true,
  });

  return (
    <>
      {isStandalone && <div ref={triggerRef} />}
      <Popover {...mergedProps} />
    </>
  );
}

export const POPOVER_COMPONENT_NAME = makeComponentName("popover");
export const POPOVER_ARROW_IMG: PlasmicElement = {
  type: "img",
  src: "https://static1.plasmic.app/arrow-up.svg",
  styles: {
    position: "absolute",
    top: "-14px",
    // center the arrow horizontally on the popover
    left: "50%",
    transform: "translateX(-50%)",
    width: "15px",
  },
};

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
        padding: "20px",
        width: "300px",
        backgroundColor: "#FDE3C3",
      },
      props: {
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: [
            POPOVER_ARROW_IMG,
            {
              type: "vbox",
              styles: {
                width: "stretch",
                padding: 0,
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
        offset: {
          type: "number",
          displayName: "Offset",
          description:
            "Additional offset applied vertically between the popover and its trigger",
          defaultValueHint: 8,
        },
        shouldFlip: {
          type: "boolean",
          description:
            "Whether the element should flip its orientation (e.g. top to bottom or left to right) when there is insufficient room for it to render completely.",
          defaultValueHint: (_props, ctx) => ctx?.defaultShouldFlip,
        },
        placement: {
          type: "choice",
          description:
            "Default placement of the popover relative to the trigger, if there is enough space",
          defaultValueHint: "bottom",
          options: [
            "bottom",
            "bottom left",
            "bottom right",
            "top",
            "top left",
            "top right",
          ],
        },
        resetClassName: {
          type: "themeResetClass",
        },
      },
      // No isOpen state for popover, because we assume that its open state is always going to be controlled by a parent like Select, Combobox, DialogTrigger, etc.
      styleSections: true,
      trapsFocus: true,
    },
    overrides
  );
}
