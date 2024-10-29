import { usePlasmicCanvasComponentInfo } from "@plasmicapp/host";
import React from "react";
import { AriaButtonProps, useButton } from "react-aria";
import { Tooltip, TooltipProps, TooltipTrigger } from "react-aria-components";
import flattenChildren from "react-keyed-flatten-children";
import { TooltipTriggerProps } from "react-stately";
import {
  CodeComponentMetaOverrides,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

function isForwardRefComponent(element: any): element is React.ReactElement {
  return element?.type?.$$typeof === Symbol.for("react.forward_ref");
}

const TOOLTIP_VARIANTS = [
  "placementTop" as const,
  "placementBottom" as const,
  "placementLeft" as const,
  "placementRight" as const,
];

export interface BaseTooltipProps
  extends TooltipTriggerProps,
    TooltipProps,
    WithVariants<typeof TOOLTIP_VARIANTS> {
  children?: React.ReactElement<HTMLElement>;
  tooltipContent?: React.ReactElement;
  resetClassName?: string;
  className?: string;
}

const { variants, withObservedValues } =
  pickAriaComponentVariants(TOOLTIP_VARIANTS);

/*

React Aria's TooltipTrigger only allows Aria Button component to act as a trigger.
https://react-spectrum.adobe.com/react-aria/Tooltip.html#example

To bypass that limitation, we originally used the useTooltipTrigger custom hooks for advanced customization, so the trigger could become anything we want.
One of the limitations with that was the placement prop - the useTooltipTrigger did not provide placement prop, and that caused issues with tooltip positioning.

We have a better fix now - instead of using useTooltipTrigger, we use useButton,
so that anything we add to the slot can be treated as an Aria Button.
That means we can use the ready-made components provided by react-aria-components (like <TooltipTrigger> and <Tooltip>)
and still be able to use any other component as a trigger.

*/

function TooltipButton(props: AriaButtonProps) {
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const { buttonProps } = useButton(props, ref);
  const { children } = props;
  if (!isForwardRefComponent(children)) {
    // The tooltip will not be triggered because the trigger component needs to be a forward ref.
    return children;
  }

  return React.cloneElement(children, {
    ...buttonProps,
    ref,
  });
}

export function BaseTooltip(props: BaseTooltipProps) {
  const {
    children,
    isDisabled,
    delay,
    closeDelay,
    trigger,
    isOpen,
    defaultOpen,
    tooltipContent,
    resetClassName,
    placement,
    offset,
    crossOffset,
    shouldFlip,
    arrowBoundaryOffset,
    className,
    onOpenChange,
    plasmicUpdateVariant,
  } = props;

  const { isSelected, selectedSlotName } =
    usePlasmicCanvasComponentInfo(props) ?? {};
  const isAutoOpen = selectedSlotName !== "children" && isSelected;

  /** We are only accepting a single child here, so we can just use the first one.
   * This is because the trigger props will be applied to the child to enable the triggering of the tooltip.
   * If there has to be more than one things here, wrap them in a horizontal stack for instance.
   * */
  const focusableChild = flattenChildren(children)[0];
  const _isOpen = isAutoOpen || isOpen;

  return (
    <TooltipTrigger
      isDisabled={isDisabled}
      delay={delay}
      closeDelay={closeDelay}
      trigger={trigger}
      isOpen={_isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <TooltipButton>{focusableChild}</TooltipButton>
      <Tooltip
        isOpen={_isOpen}
        offset={offset}
        crossOffset={crossOffset}
        shouldFlip={shouldFlip}
        arrowBoundaryOffset={arrowBoundaryOffset}
        defaultOpen={defaultOpen}
        className={`${className} ${resetClassName}`}
        onOpenChange={onOpenChange}
        placement={placement}
      >
        {({ placement: _placement }) =>
          withObservedValues(
            tooltipContent,
            {
              placementTop: _placement === "top",
              placementBottom: _placement === "bottom",
              placementLeft: _placement === "left",
              placementRight: _placement === "right",
            },
            plasmicUpdateVariant
          )
        }
      </Tooltip>
    </TooltipTrigger>
  );
}

export function registerTooltip(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseTooltip>
) {
  registerComponentHelper(
    loader,
    BaseTooltip,
    {
      name: "plasmic-react-aria-tooltip",
      displayName: "Aria Tooltip",
      importPath: "@plasmicpkgs/react-aria/skinny/registerTooltip",
      importName: "BaseTooltip",
      isAttachment: true,
      styleSections: true,
      variants,
      props: {
        children: {
          type: "slot",
          mergeWithParent: true,
          displayName: "Trigger",
          defaultValue: {
            type: "text",
            value: "Hover me!",
            styles: {
              width: "hug",
            },
          },
        },
        tooltipContent: {
          type: "slot",
          mergeWithParent: true,
          displayName: "Tooltip Content",
          // NOTE: This is not applied in attachment
          defaultValue: {
            type: "text",
            value: "Hello from Tooltip!",
            styles: {
              // So the text does not overlap with existing content
              backgroundColor: "white",
            },
          },
        },
        resetClassName: {
          type: "themeResetClass",
        },
        isDisabled: {
          type: "boolean",
        },
        delay: {
          type: "number",
          // Default value is explicitly set to 0 to prevent users from mistakenly thinking the tooltip isn’t opening due to a delay.
          defaultValue: 0,
          defaultValueHint: 0,
          description:
            "The delay (in milliseconds) for the tooltip to show up.",
        },
        closeDelay: {
          type: "number",
          // Default value is explicitly set to 0 to prevent users from mistakenly thinking the tooltip isn’t closing due to a delay.
          defaultValue: 0,
          defaultValueHint: 0,
          description: "The delay (in milliseconds) for the tooltip to close.",
        },
        trigger: {
          type: "choice",
          options: ["focus", "focus and hover"],
          defaultValueHint: "focus and hover",
        },
        placement: {
          type: "choice",
          description:
            "Default placement of the popover relative to the trigger, if there is enough space",
          defaultValueHint: "top",
          // Not providing more options because https://github.com/adobe/react-spectrum/issues/6517
          options: ["top", "bottom", "left", "right"],
        },
        isOpen: {
          type: "boolean",
          editOnly: true,
          uncontrolledProp: "defaultOpen",
          description: "Whether the overlay is open by default",
          defaultValueHint: false,
          hidden: () => true,
        },
        onOpenChange: {
          type: "eventHandler",
          argTypes: [{ name: "isOpen", type: "boolean" }],
        },
      },
      states: {
        isOpen: {
          type: "writable",
          valueProp: "isOpen",
          onChangeProp: "onOpenChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
