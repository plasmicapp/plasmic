import { motion } from "framer-motion";
import React from "react";
import { Overlay, Placement, useOverlayTrigger, usePopover } from "react-aria";
import { OverlayTriggerState, useOverlayTriggerState } from "react-stately";

export function PricingTooltip(props: {
  overlay?: React.ReactNode;
  trigger?: React.ReactNode;
  forceOverlay?: boolean;
  placement?: Placement;
  offset?: number;
  crossOffset?: number;
  triggeredBy?: "hover" | "click";
}) {
  const {
    forceOverlay,
    trigger: _trigger,
    triggeredBy = "hover",
    overlay,
    placement,
    offset,
    crossOffset,
  } = props;

  const trigger = React.Children.map(_trigger, (x) => x)?.filter((x) =>
    React.isValidElement(x)
  )[0] as React.ReactElement | undefined;
  const triggerRef = React.useRef<any>(null);
  const state = useOverlayTriggerState(forceOverlay ? { isOpen: true } : {});
  const { triggerProps, overlayProps } = useOverlayTrigger(
    { type: "dialog" },
    state,
    triggerRef
  );

  return (
    <>
      {trigger &&
        React.cloneElement(trigger, {
          ...triggerProps,
          ...(triggeredBy === "hover"
            ? {
                onMouseEnter: () => state.open(),
                onMouseLeave: () => state.close(),
              }
            : {
                onClick: () => state.toggle(),
              }),
          ref: triggerRef,
        })}
      {state.isOpen && (
        <Popover
          overlay={overlay}
          placement={placement}
          offset={offset}
          crossOffset={crossOffset}
          overlayProps={overlayProps}
          triggerRef={triggerRef}
          state={state}
        />
      )}
    </>
  );
}

function Popover(props: {
  overlay?: React.ReactNode;
  placement?: Placement;
  offset?: number;
  crossOffset?: number;
  triggerRef: React.RefObject<any>;
  state: OverlayTriggerState;
  overlayProps?: any;
}) {
  const {
    placement,
    offset,
    crossOffset,
    triggerRef,
    state,
    overlay: _overlay,
    overlayProps,
  } = props;
  const overlay = React.Children.map(_overlay, (x) => x)?.filter((x) =>
    React.isValidElement(x)
  )[0] as React.ReactElement | undefined;

  const popoverRef = React.useRef<any>(null);
  const { popoverProps } = usePopover(
    {
      triggerRef,
      popoverRef,
      placement,
      offset,
      crossOffset,
    },
    state
  );

  if (!overlay) {
    return null;
  }

  return (
    <Overlay>
      <motion.div
        {...(popoverProps as any)}
        initial={{ opacity: 0, ...exit(placement) }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, ...exit(placement) }}
        ref={popoverRef}
      >
        {React.cloneElement(overlay, {
          ...overlayProps,
        })}
      </motion.div>
    </Overlay>
  );
}

function exit(placement?: Placement) {
  if (placement === "bottom") {
    return { y: -8 };
  } else if (placement === "top") {
    return { y: 8 };
  } else if (placement === "left") {
    return { x: -8 };
  } else if (placement === "right") {
    return { x: 8 };
  } else {
    return { y: -8 };
  }
}
