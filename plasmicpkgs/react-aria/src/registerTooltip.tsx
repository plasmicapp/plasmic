import { usePlasmicCanvasComponentInfo } from "@plasmicapp/host";
import React from "react";
import { useFocusable } from "react-aria";
import { Tooltip, TooltipProps, TooltipTrigger } from "react-aria-components";
import { TooltipTriggerProps } from "react-stately";
import { COMMON_STYLES, getCommonOverlayProps } from "./common";
import {
  CodeComponentMetaOverrides,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

/*
  NOTE: Placement should be managed as variants, not just props.
  When `shouldFlip` is true, the placement prop may not represent the final position
  (e.g., if placement is set to "bottom" but lacks space, the tooltip may flip to "top").
  However, data-selectors will consistently indicate the actual placement of the tooltip.
*/
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
  children: React.ReactElement<HTMLElement>;
  tooltipContent?: React.ReactElement;
  resetClassName?: string;
  className?: string;
}

interface TriggerWrapperProps {
  children: React.ReactElement;
  className?: string;
}

const { variants, withObservedValues } =
  pickAriaComponentVariants(TOOLTIP_VARIANTS);

/*

  React Aria's TooltipTrigger TooltipTrigger requires a focusable element with ref.
  To make sure that this requirement is fulfilled, wrap everything in a focusable div.
  https://react-spectrum.adobe.com/react-aria/Tooltip.html#example
  (In the example, Aria Button works as a trigger because it uses useFocusable behind the scenes)

  Discussion (React-aria-components TooltipTrigger with custom button):
  https://github.com/adobe/react-spectrum/discussions/5119#discussioncomment-7084661

  */
function TriggerWrapper({ children, className }: TriggerWrapperProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { focusableProps } = useFocusable({}, ref);
  return (
    <div
      ref={ref}
      className={className}
      {...focusableProps}
      style={COMMON_STYLES}
    >
      {children}
    </div>
  );
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
    onOpenChange,
    plasmicUpdateVariant,
  } = props;

  const { isSelected, selectedSlotName } =
    usePlasmicCanvasComponentInfo?.(props) ?? {};
  const isAutoOpen = selectedSlotName !== "children" && isSelected;
  const _isOpen = (isAutoOpen || isOpen) ?? false;

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
      <TriggerWrapper className={resetClassName}>{children}</TriggerWrapper>
      <Tooltip
        isOpen={_isOpen}
        offset={offset}
        crossOffset={crossOffset}
        shouldFlip={shouldFlip}
        defaultOpen={defaultOpen}
        className={resetClassName}
        onOpenChange={onOpenChange}
        placement={placement}
      >
        {({ placement: _placement }) =>
          withObservedValues(
            <>{tooltipContent}</>,
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
      styleSections: false,
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
              background: "black",
              color: "white",
              padding: "7px",
              borderRadius: "7px",
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
        ...getCommonOverlayProps<BaseTooltipProps>("popover", {
          placement: { defaultValueHint: "top" },
          offset: { defaultValueHint: 0 },
          containerPadding: { defaultValueHint: 12 },
          crossOffset: { defaultValueHint: 0 },
        }),
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
