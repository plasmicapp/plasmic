import React, { useCallback, useContext, useRef, useState } from "react";
import { mergeProps, useFocusWithin, useHover, useId } from "react-aria";
import {
  Provider,
  Tooltip,
  TooltipProps,
  TooltipTriggerStateContext,
} from "react-aria-components";
import { TooltipTriggerProps, useTooltipTriggerState } from "react-stately";
import { COMMON_STYLES, createIdProp, getCommonOverlayProps } from "./common";
import {
  CodeComponentMetaOverrides,
  PlasmicCanvasProps,
  Registerable,
  registerComponentHelper,
  useIsOpen,
} from "./utils";

export interface BaseTooltipProps
  extends Omit<TooltipTriggerProps, "trigger">,
    TooltipProps,
    PlasmicCanvasProps {
  children: React.ReactElement<HTMLElement>;
  tooltipContent?: React.ReactElement;
  resetClassName?: string;
  trigger?: "focus" | "focus and hover" | undefined;
  className?: string;
  id?: string;
}

// In Studio, the tooltip is always controlled because isOpen is attached to the code component's state.
// In Codegen, the user decides whether the tooltip is controlled or not. So we need to handle both cases.
export function BaseTooltip(props: BaseTooltipProps) {
  if (props.isOpen !== undefined) {
    return <ControlledBaseTooltip {...props} />;
  } else {
    return <UncontrolledBaseTooltip {...props} />;
  }
}

function UncontrolledBaseTooltip({ onOpenChange, ...props }: BaseTooltipProps) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const onOpenChangeMerged = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );
  return (
    <ControlledBaseTooltip
      {...props}
      isOpen={open}
      onOpenChange={onOpenChangeMerged}
    />
  );
}

function ControlledBaseTooltip(props: BaseTooltipProps) {
  const {
    children,
    isDisabled = false,
    trigger,
    isOpen,
    tooltipContent,
    resetClassName,
    placement,
    offset,
    crossOffset,
    shouldFlip,
    className,
  } = props;

  const isCanvasAwareOpen = useIsOpen({
    triggerSlotName: "children",
    isOpen,
    props,
  });

  // The following is a custom implementation of the <TooltipTrigger /> component.
  // The default <TooltipTrigger /> from react-aria-components automatically manages state changes when a useFocusable element (e.g., an Aria Button) is clicked.
  // However, in our custom trigger, <TriggerWrapper>, we use useFocusWithin to explicitly handle state changes, allowing any element—not just an Aria Button—to act as a trigger.
  // However, this results in duplicate state updates when using an Aria Button, as state changes are triggered both by useFocusWithin and useFocusable.
  // Consequently, onOpenChange is called twice.
  //
  // This implementation is adapted from:
  // https://github.com/adobe/react-spectrum/blob/988096cf3f1dbd59f274d8c552e9fe7d5dcf4f41/packages/react-aria-components/src/Tooltip.tsx#L89
  // The <FocusableProvider> has been removed, as it handles automatic state updates for the Aria Button.
  const ref = useRef<any>(null);
  // Use provided id as the default for useId so it lands on the Tooltip root element
  const tooltipId = useId(props.id);

  const state = useTooltipTriggerState({
    ...props,
    isOpen: isCanvasAwareOpen,
    trigger: trigger === "focus" ? trigger : undefined,
  });

  return (
    // TooltipTriggerStateContext used by BaseOverlayArrow
    <Provider values={[[TooltipTriggerStateContext, state]]}>
      <TriggerWrapper
        ref={ref}
        className={className}
        tooltipId={state.isOpen ? tooltipId : undefined}
        isDisabled={isDisabled}
        triggerOnFocusOnly={trigger === "focus"}
      >
        {children}
      </TriggerWrapper>
      <Tooltip
        triggerRef={ref}
        // @ts-expect-error <Tooltip> is wrongly typed to not have id prop
        id={tooltipId}
        offset={offset}
        crossOffset={crossOffset}
        shouldFlip={shouldFlip}
        className={resetClassName}
        placement={placement}
      >
        {tooltipContent}
      </Tooltip>
    </Provider>
  );
}

interface TriggerWrapperProps {
  children: React.ReactElement;
  isDisabled: boolean;
  triggerOnFocusOnly: boolean;
  tooltipId?: string;
  className?: string;
}

// React Aria's TooltipTrigger requires a focusable element with ref.
// To make sure that this requirement is fulfilled, wrap everything in a focusable div.
// https://react-spectrum.adobe.com/react-aria/Tooltip.html#example
// (In the example, Aria Button works as a trigger because it uses useFocusable behind the scenes)
//
// Discussion (React-aria-components TooltipTrigger with custom button):
// https://github.com/adobe/react-spectrum/discussions/5119#discussioncomment-7084661
const TriggerWrapper = React.forwardRef<HTMLDivElement, TriggerWrapperProps>(
  function TriggerWrapper_(
    { children, isDisabled, triggerOnFocusOnly, tooltipId, className },
    ref: React.Ref<HTMLDivElement>
  ) {
    const state = useContext(TooltipTriggerStateContext)!;

    const { hoverProps } = useHover({
      isDisabled,
      onHoverStart: () => !triggerOnFocusOnly && state.open(),
      onHoverEnd: () => !triggerOnFocusOnly && state.close(),
    });

    // useFocusWithin captures focus events for all nested focusable elements
    const { focusWithinProps } = useFocusWithin({
      isDisabled,
      onFocusWithin: () => state.open(),
      onBlurWithin: () => state.close(),
    });

    const mergedProps = mergeProps(hoverProps, focusWithinProps, {
      "aria-describedby": tooltipId,
      // We expose className to allow user control over the wrapper div's styling.
      className,
      ref,
      style: COMMON_STYLES,
    });

    return <div {...mergedProps}>{children}</div>;
  }
);

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
      props: {
        id: createIdProp("Tooltip"),
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
          // Default value is explicitly set to 50 to prevent users from mistakenly thinking the tooltip isn’t closing due to a delay.
          // We don't set it to 0, because when offset=0 and closeDelay=0, entering from the tooltip side causes the
          // cursor to immediately move from trigger to tooltip content. This fires
          // onHoverEnd on the trigger and closes the tooltip instantly.
          // A small closeDelay (>=50ms) allows it to stabilize.
          defaultValue: 50,
          defaultValueHint: 50,
          min: 50,
          description: "The delay (in milliseconds) for the tooltip to close.",
        },
        trigger: {
          type: "choice",
          options: ["focus", "focus and hover"],
          defaultValueHint: "focus and hover",
        },
        ...getCommonOverlayProps<BaseTooltipProps>("Tooltip", {
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
          // Without a default value, the tooltip starts as uncontrolled and then switches to controlled on first interaction,
          // which can cause React warnings and unpredictable behavior.
          defaultValue: false,
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
