import { mergeProps } from "@react-aria/utils";
import React from "react";
import { useTooltipTrigger } from "react-aria";
import { TooltipProps } from "react-aria-components";
import flattenChildren from "react-keyed-flatten-children";
import { TooltipTriggerProps, useTooltipTriggerState } from "react-stately";
import {
  CodeComponentMetaOverrides,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface BaseTooltipProps extends TooltipTriggerProps, TooltipProps {
  children?: React.ReactElement<HTMLElement>;
  tooltipContent?: React.ReactElement;
  resetClassName?: string;
  className?: string;
}

export function BaseTooltip(props: BaseTooltipProps) {
  const { children, tooltipContent, className, resetClassName, ...restProps } =
    props;
  const state = useTooltipTriggerState(restProps);
  const ref = React.useRef(null);
  const { triggerProps, tooltipProps } = useTooltipTrigger(
    restProps,
    state,
    ref
  );

  const hasContent =
    tooltipContent &&
    (tooltipContent.type as any).name !== "CanvasSlotPlaceholder";

  /** We are only accepting a single child here, so we can just use the first one.
   * This is because the trigger props will be applied to the child to enable the triggering of the tooltip.
   * If there has to be more than one things here, wrap them in a horizontal stack for instance.
   * */
  const focusableChild = flattenChildren(children)[0];

  return (
    <div
      // this is to ensure that the absolutely positioned tooltip can be positioned correctly within this relatively positioned container.
      style={{ position: "relative" }}
      className={resetClassName}
    >
      {React.isValidElement(focusableChild)
        ? React.cloneElement(focusableChild, {
            ref,
            ...mergeProps(
              focusableChild.props as Record<string, any>,
              triggerProps
            ),
          } as Record<string, any> & { ref?: React.Ref<HTMLElement> })
        : null}
      {state.isOpen && (
        <>
          {React.cloneElement(
            hasContent ? (
              tooltipContent
            ) : (
              <p>Add some content to the tooltip...</p>
            ),
            mergeProps(tooltipProps, tooltipContent?.props.attrs, { className })
          )}
        </>
      )}
    </div>
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
      props: {
        children: {
          type: "slot",
          defaultValue: {
            type: "text",
            value: "Hover me!",
          },
        },
        tooltipContent: {
          type: "slot",
          displayName: "Tooltip Content",
          // NOTE: This is not applied in attachment
          defaultValue: {
            type: "text",
            value: "Hello from Tooltip!",
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
          defaultValueHint: 1500,
          description:
            "The delay (in milliseconds) for the tooltip to show up.",
        },
        closeDelay: {
          type: "number",
          defaultValueHint: 500,
          description: "The delay (in milliseconds) for the tooltip to close.",
        },
        trigger: {
          type: "choice",
          options: ["focus", "focus and hover"],
          defaultValueHint: "focus and hover",
        },
        isOpen: {
          type: "boolean",
          editOnly: true,
          uncontrolledProp: "defaultOpen",
          description: "Whether the overlay is open by default",
          defaultValueHint: false,
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
    },
    overrides
  );
}
