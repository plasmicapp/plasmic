import { PlasmicElement, usePlasmicCanvasContext } from "@plasmicapp/host";
import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Popover, PopoverContext, SelectContext } from "react-aria-components";
import { PlasmicPopoverContext } from "./contexts";
import {
  BaseControlContextData,
  CodeComponentMetaOverrides,
  Registerable,
  isDefined,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

interface PopoverControlContextData extends BaseControlContextData {
  isInsideSelect: boolean;
}

export interface BasePopoverProps extends React.ComponentProps<typeof Popover> {
  className?: string;
  resetClassName?: string;
  setControlContextData?: (ctxData: PopoverControlContextData) => void;
}

const SHOULD_FLIP_INSIDE_SELECT = false;

export function BasePopover(props: BasePopoverProps) {
  const { resetClassName, setControlContextData, ...restProps } = props;
  const isStandalone = !React.useContext(PopoverContext);
  const contextProps = React.useContext(PlasmicPopoverContext);
  const isInsideSelect = !!React.useContext(SelectContext);

  const mergedProps = mergeProps(
    contextProps,
    restProps,
    {
      className: `${resetClassName}`,
    },
    isInsideSelect &&
      !isDefined<BasePopoverProps["shouldFlip"]>(restProps.shouldFlip)
      ? { shouldFlip: SHOULD_FLIP_INSIDE_SELECT }
      : undefined
  );

  const isEditMode = !!usePlasmicCanvasContext();

  const triggerRef = React.useRef<any>(null);

  const standaloneProps = isStandalone
    ? {
        triggerRef,
        isNonModal: true,
        isOpen: true,
      }
    : {};

  setControlContextData?.({
    isStandalone,
    isInsideSelect,
  });

  return (
    <>
      {isStandalone && <div ref={triggerRef} />}
      <Popover
        isNonModal={isEditMode ? true : undefined}
        {...mergedProps}
        {...standaloneProps}
      />
    </>
  );
}

export const POPOVER_COMPONENT_NAME = makeComponentName("popover");
export const POPOVER_ARROW_IMG: PlasmicElement = {
  type: "img",
  // TODO: Replace with the image of an arrow pointing up, like: https://icon-sets.iconify.design/mdi/triangle/
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
          defaultValue: [
            POPOVER_ARROW_IMG,
            {
              type: "vbox",
              styles: {
                width: "stretch",
                padding: 0,
                gap: "10px",
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
          defaultValueHint: 0,
        },
        shouldFlip: {
          type: "boolean",
          description:
            "Whether the element should flip its orientation (e.g. top to bottom or left to right) when there is insufficient room for it to render completely.",
          defaultValueHint: (
            _ps: BasePopoverProps,
            ctx: PopoverControlContextData | null
          ) => (ctx?.isInsideSelect ? SHOULD_FLIP_INSIDE_SELECT : true),
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
      styleSections: true,
    },
    overrides
  );
}
