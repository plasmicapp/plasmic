import { DOMProps } from "@react-types/shared";
import * as React from "react";
import {
  DismissButton,
  FocusScope,
  useOverlay,
  useOverlayPosition,
} from "react-aria";
import * as ReactDOM from "react-dom";
import { pick } from "../../common";
import {
  mergeProps,
  mergeRefs,
  useIsomorphicLayoutEffect,
} from "../../react-utils";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  PLUME_STRICT_MODE,
  VariantDef,
} from "../plume-utils";
import {
  getDefaultPlasmicProps,
  getStyleProps,
  StyleProps,
} from "../props-utils";
import { TriggeredOverlayContext } from "./context";

export interface BaseTriggeredOverlayProps extends StyleProps, DOMProps {
  children?: React.ReactNode;
}

export interface TriggeredOverlayConfig<C extends AnyPlasmicClass> {
  isPlacedTopVariant?: VariantDef<PlasmicClassVariants<C>>;
  isPlacedBottomVariant?: VariantDef<PlasmicClassVariants<C>>;
  isPlacedLeftVariant?: VariantDef<PlasmicClassVariants<C>>;
  isPlacedRightVariant?: VariantDef<PlasmicClassVariants<C>>;

  contentSlot: keyof PlasmicClassArgs<C>;
  root: keyof PlasmicClassOverrides<C>;
  contentContainer: keyof PlasmicClassOverrides<C>;
}

export type TriggeredOverlayRef = React.Ref<HTMLElement>;

export function useTriggeredOverlay<
  P extends BaseTriggeredOverlayProps,
  C extends AnyPlasmicClass
>(
  plasmicClass: C,
  props: P,
  config: TriggeredOverlayConfig<C>,
  outerRef: TriggeredOverlayRef = null
) {
  const overlayRef = React.useRef<HTMLElement>(null);
  const onOverlayRef = mergeRefs(overlayRef, outerRef);

  const context = React.useContext(TriggeredOverlayContext);

  if (!context) {
    // If no context, then we are not being correctly used.  Either complain, or
    // exit early.  It's okay to exit early and break the rules of React hooks
    // because we won't suddenly have the appropriate context anyway for this instance.
    if (PLUME_STRICT_MODE) {
      throw new Error(
        "You can only use a triggered overlay with a TriggeredOverlayContext"
      );
    }
    return getDefaultPlasmicProps(plasmicClass, props);
  }

  const { children } = props;
  const {
    triggerRef,
    placement,
    overlayMatchTriggerWidth,
    overlayMinTriggerWidth,
    overlayWidth,
    state,
  } = context;

  // Measure the width of the trigger to inform the width of the menu (below).
  const [isRendered, setRendered] = React.useState(false);
  const triggerWidth =
    triggerRef.current && (overlayMatchTriggerWidth || overlayMinTriggerWidth)
      ? triggerRef.current.offsetWidth
      : undefined;

  useIsomorphicLayoutEffect(() => {
    if (
      !isRendered &&
      triggerRef.current &&
      (overlayMatchTriggerWidth || overlayMinTriggerWidth)
    ) {
      setRendered(true);
    }
  }, [
    triggerRef,
    isRendered,
    overlayMatchTriggerWidth,
    overlayMinTriggerWidth,
  ]);

  const { overlayProps: overlayAriaProps } = useOverlay(
    {
      isOpen: state.isOpen,
      onClose: state.close,
      isDismissable: true,
      shouldCloseOnBlur: true,
    },
    overlayRef
  );

  const {
    overlayProps: overlayPositionProps,
    updatePosition,
    placement: placementAxis,
  } = useOverlayPosition({
    targetRef: triggerRef,
    overlayRef,
    placement: placement ?? "bottom left",
    shouldFlip: true,
    isOpen: state.isOpen,
    onClose: state.close,
    containerPadding: 0,
  });

  useIsomorphicLayoutEffect(() => {
    if (state.isOpen) {
      requestAnimationFrame(() => {
        updatePosition();
      });
    }
  }, [state.isOpen, updatePosition]);

  const overlayProps = mergeProps(
    {
      style: {
        left: "auto",
        right: "auto",
        top: "auto",
        bottom: "auto",
        position: "absolute",
        width:
          overlayWidth ?? (overlayMatchTriggerWidth ? triggerWidth : "auto"),
        minWidth: overlayMinTriggerWidth ? triggerWidth : "auto",
      },
    },
    overlayAriaProps,
    overlayPositionProps
  );

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.isPlacedTopVariant, active: placementAxis === "top" },
      { def: config.isPlacedBottomVariant, active: placementAxis === "bottom" },
      { def: config.isPlacedLeftVariant, active: placementAxis === "left" },
      { def: config.isPlacedRightVariant, active: placementAxis === "right" }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.contentSlot]: (
      <FocusScope restoreFocus>
        <DismissButton onDismiss={state.close} />
        {children}
        {/* We don't use the DismissButton at the end because it ends up taking up 1px space :-/ */}
        {/* <DismissButton onDismiss={state.close} /> */}
      </FocusScope>
    ),
  };

  const overrides: Overrides = {
    [config.root]: {
      props: mergeProps(overlayProps, getStyleProps(props), {
        ref: onOverlayRef,
      }),
      wrap: (root) => {
        if (typeof document !== "undefined") {
          return ReactDOM.createPortal(root, document.body);
        } else {
          // Possibly being invoked on the server during SSR; no need to
          // bother with a portal in that case.
          return root;
        }
      },
    },
  };

  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      args: args as PlasmicClassArgs<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
    },
  };
}
