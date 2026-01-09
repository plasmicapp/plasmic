import { PropValuePath } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { ModalScope } from "@/wab/client/components/widgets/ModalScope";
import { plasmicIFrameMouseDownEvent } from "@/wab/client/definitions/events";
import PlasmicPopoverFrame from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicPopoverFrame";
import { STUDIO_SHORTCUTS } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { zIndex } from "@/wab/client/z-index";
import { useInteractOutsideWithCommonExceptions } from "@/wab/commons/components/OnClickAway";
import { arrayReversed } from "@/wab/shared/collections";
import { cx, ensure } from "@/wab/shared/common";
import domAlign from "dom-align";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";
import { OverlayProvider, useOverlay, useOverlayPosition } from "react-aria";
import ReactDOM from "react-dom";
import { animated, useSpring } from "react-spring";
import ResizeObserver from "resize-observer-polyfill";

interface Store {
  state: PopoverFrameState;
  dispatch: React.Dispatch<Action>;
}

interface PopoverStackFrame {
  id: string;
  onClose?: () => void;
  element: HTMLDivElement;
  persistOnInteractOutside?: boolean;
  triggerElement?: HTMLElement;
  valuePath: PropValuePath;
}

interface PopoverFrameState {
  containerSelector: string;
  stack: PopoverStackFrame[];
}
const PopoverFrameContext = React.createContext<Store | undefined>(undefined);

function usePopoverFrameContext() {
  return ensure(
    React.useContext(PopoverFrameContext),
    "Unexpected nullish PopoverFrameContext"
  );
}

/**
 * Hook to check if we're inside a PopoverFrame context.
 * Returns the context if available, or undefined if not.
 */
export function useMaybePopoverFrameContext() {
  return React.useContext(PopoverFrameContext);
}

interface PushAction {
  type: "push";
  frame: PopoverStackFrame;
}
interface PopAction {
  type: "pop";
  // If frameId specified, remove that specific frame (for cleanup)
  // Otherwise, remove the last frame (for user interactions)
  frameId?: string;
}
interface PopAllAction {
  type: "popAll";
}

type Action = PushAction | PopAction | PopAllAction;

/**
 * Reducer function for managing the PopoverFrame stack state
 */
function popoverFrameReducer(
  state: PopoverFrameState,
  action: Action
): PopoverFrameState {
  if (action.type === "push") {
    const existing = state.stack.find((f) => f.id === action.frame.id);
    if (existing) {
      return {
        ...state,
        stack: state.stack.map((f) => (f === existing ? action.frame : f)),
      };
    }
    // Replace the stack if the path root changes, or if the root is an array
    // and the index changes (determined by checking the second path value)
    const path = action.frame.valuePath;
    const rootChanged = path[0] !== state.stack[0]?.valuePath[0];
    const shouldReplace =
      rootChanged ||
      (typeof path[1] === "number" && path[1] !== state.stack[0]?.valuePath[1]);

    if (shouldReplace) {
      arrayReversed(state.stack).forEach((frame) => frame.onClose?.());
      return { ...state, stack: [action.frame] };
    }

    // This is either the first popover or a nested one
    return {
      ...state,
      stack: [...state.stack, action.frame],
    };
  } else if (action.type === "pop") {
    const targetId = action.frameId ?? L.last(state.stack)?.id;
    const popped = state.stack.find((f) => f.id === targetId);
    if (popped) {
      popped.onClose?.();
      return {
        ...state,
        stack: state.stack.filter((f) => f.id !== targetId),
      };
    }
  } else if (action.type === "popAll") {
    if (state.stack.length > 0) {
      arrayReversed(state.stack).forEach((frame) => frame.onClose?.());
      return { ...state, stack: [] };
    }
  }
  return state;
}

/**
 * A root component that collects popovers into nestable screens. There should
 * be one per container where popovers are nested. Nesting means that when a <PopoverFrame/>
 * is embedded in another one, it stacks on top.
 *
 * @param props.containerSelector container element css selector the popover will be added to.
 */
export function PopoverFrameProvider(props: {
  containerSelector: string;
  children?: React.ReactNode;
}) {
  const { containerSelector, children } = props;
  const [state, dispatch] = React.useReducer(popoverFrameReducer, {
    containerSelector,
    stack: [],
  });

  const store = React.useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return (
    <PopoverFrameContext.Provider value={store}>
      <PopoverFrameShell />
      {children}
    </PopoverFrameContext.Provider>
  );
}

export interface PopoverFrameProps {
  show: boolean;
  title?: React.ReactNode;
  valuePath: PropValuePath;
  children?: React.ReactNode;
  onClose?: () => void;
  dismissOnEnter?: boolean;
  persistOnInteractOutside?: boolean;
  triggerElement?: HTMLElement;
}

/**
 * Creates a props popover.
 * Requires a PopoverFrameProvider ancestor in the component tree.
 */
export function PopoverFrame(props: PopoverFrameProps) {
  const { children, ...restProps } = props;

  // The same popover will always have the same frameId.
  const frameId = React.useId();

  return props.show ? (
    <PopoverFrameInternal frameId={frameId} {...restProps}>
      {children}
    </PopoverFrameInternal>
  ) : null;
}

const PopoverFrameInternal = observer(function PopoverFrameInternal(
  props: PopoverFrameProps & { frameId: string }
) {
  // This component doesn't render anything; it dispatches push and pop
  // actions to the PopoverFrameContext store to manage popover content.
  // PopoverFrameShell picks up new frames and renders popovers.
  const {
    frameId,
    title,
    valuePath,
    children,
    onClose,
    dismissOnEnter,
    persistOnInteractOutside,
    triggerElement,
  } = props;

  const [element] = React.useState(() => {
    const elt = document.createElement("div");
    elt.classList.add("flex-col");
    elt.classList.add("overflow-hidden");
    return elt;
  });
  const { state, dispatch } = usePopoverFrameContext();

  const frame = React.useMemo(
    () =>
      ({
        id: frameId,
        onClose,
        element,
        persistOnInteractOutside,
        valuePath,
        triggerElement,
      } as PopoverStackFrame),
    [frameId, onClose, element, triggerElement]
  );

  // We push the popover content whenever it changes
  React.useEffect(() => {
    dispatch({ type: "push", frame });
  }, [frame]);

  // Pop the frame on unmount (frameId required to ensure it hasn't been popped already)
  React.useEffect(() => {
    return () => {
      dispatch({ type: "pop", frameId });
    };
  }, [frameId]);

  // Render the popover content in a portal, so in the React tree the portal
  // content is a child of the parent component. We render to an unattached
  // element, and PopoverFrameShell attaches it to the DOM tree.
  return ReactDOM.createPortal(
    <ModalScope
      className="flex-col"
      containFocus={false}
      allowKeyCombos={[
        STUDIO_SHORTCUTS.UNDO.combos,
        STUDIO_SHORTCUTS.REDO.combos,
      ]}
    >
      <div
        className="flex-col"
        onKeyDown={(e) => {
          if (e.key === "Escape" || (e.key === "Enter" && dismissOnEnter)) {
            e.preventDefault();
            e.stopPropagation();
            dispatch({ type: "pop" });
          }
        }}
      >
        <PlasmicPopoverFrame
          propTitle={{
            showBack: frame?.element !== state.stack[0]?.element,
            title,
            back: {
              ["data-test-id"]: "back-popover-frame",
              onClick: () => dispatch({ type: "pop" }),
            },
            close: {
              ["data-test-id"]: "close-popover-frame",
              onClick: () => dispatch({ type: "popAll" }),
            },
          }}
          popoverContent={children}
        />
      </div>
    </ModalScope>,
    element
  );
});

function PopoverFrameShell() {
  const popupRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const { state, dispatch } = usePopoverFrameContext();
  const { containerSelector, stack } = state;
  const lastFrame = L.last(stack);

  // Update triggerRef when trigger element changes
  React.useEffect(() => {
    triggerRef.current = stack[0]?.triggerElement ?? null;
  }, [stack]);

  const [popoverHeight, setPopoverHeight] = React.useState(0);
  const container = document.querySelector(containerSelector);
  const [minHeight, setMinHeight] = React.useState(
    container ? Math.min(popoverHeight, container.clientHeight - 50) : undefined
  );
  const [contentContainer, setContentContainer] = React.useState<
    Element | undefined
  >(undefined);
  const [titleContainer, setTitleContainer] = React.useState<
    Element | undefined
  >(undefined);

  React.useEffect(() => {
    if (!contentContainer || !titleContainer || !container) {
      return;
    }

    const _observer = new ResizeObserver(() => {
      const newPopoverHeight =
        titleContainer.getBoundingClientRect().height +
        contentContainer.getBoundingClientRect().height +
        4;
      const newMinHeight = Math.min(
        newPopoverHeight,
        container.clientHeight - 50
      );
      setMinHeight(newMinHeight);
      setPopoverHeight(newPopoverHeight);
    });

    _observer.observe(titleContainer);
    _observer.observe(contentContainer);
    _observer.observe(container);

    return () => _observer.disconnect();
  }, [container, contentContainer, titleContainer]);

  // Use triggerElement for smart positioning
  const hasTrigger = !!stack[0]?.triggerElement;
  const { overlayProps: positionProps } = useOverlayPosition({
    targetRef: triggerRef,
    overlayRef: popupRef,
    placement: "right top",
    offset: 8,
    isOpen: !!lastFrame && hasTrigger,
  });

  // Fallback positioning for when there's no trigger
  React.useEffect(() => {
    if (!hasTrigger && popupRef.current) {
      const pane = document.querySelector(containerSelector);
      if (pane) {
        domAlign(popupRef.current, pane, {
          points: ["tc", "tc"],
          offset: [0, 40],
        });
      }
    }
  }, [hasTrigger, containerSelector, stack.length]);

  // We use @react-aria's useOverlay to catch Escape.  We don't use
  // it for catching clicks outside the popover because it always closes
  // the overlay on any click outside popupRef, including clicks on
  // menus, selects, and other overlay divs.  So instead, we do this
  // ourselves with our own call to `useInteractOutside()`.
  const { overlayProps } = useOverlay(
    {
      isOpen: !!lastFrame,
      isDismissable: false,
      onClose: () => dispatch({ type: "pop" }),
    },
    popupRef
  );

  useInteractOutsideWithCommonExceptions({
    ref: popupRef,
    onInteractOutside: () => {
      if (!lastFrame?.persistOnInteractOutside) {
        dispatch({ type: "pop" });
      }
    },
  });

  React.useEffect(() => {
    const onHide = () => {
      if (!lastFrame?.persistOnInteractOutside) {
        dispatch({ type: "popAll" });
      }
    };
    document.addEventListener(plasmicIFrameMouseDownEvent, onHide);
    return () => {
      document.removeEventListener(plasmicIFrameMouseDownEvent, onHide);
    };
  }, [dispatch, lastFrame]);

  // Current page index (0-based, represents which frame is visible)
  const currentPageIndex = Math.max(0, stack.length - 1);

  // Animate the page index for smooth transitions
  const spring = useSpring({
    pageIndex: currentPageIndex,
    config: { tension: 280, friction: 30 },
  });

  if (!lastFrame || !container) {
    // Nothing to display
    return null;
  }

  return ReactDOM.createPortal(
    <OverlayProvider>
      <div
        className={cx("auto-pointer-events")}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: zIndex.popover,
          pointerEvents: "none",
        }}
      >
        <div
          ref={popupRef}
          id="props-popover"
          className={cx("dev-env panel-popup")}
          style={{
            minHeight: minHeight,
            pointerEvents: "auto",
            overflow: "hidden",
            ...positionProps.style,
          }}
          {...overlayProps}
        >
          {stack.map((item, frameIndex) => {
            return (
              <animated.div
                key={item.id}
                className="flex-col"
                style={{
                  position: "absolute",
                  overflow: "hidden",
                  top: 0,
                  width: "100%",
                  height: "100%",
                  // Position based on distance from current page index
                  // This creates the sliding effect as pageIndex animates
                  left: spring.pageIndex.to(
                    (pageIdx) => `${(frameIndex - pageIdx) * 105}%`
                  ),
                }}
              >
                <div
                  ref={(elt) => {
                    if (elt) {
                      // Always attach item.element - portal will render into it
                      if (item.element.parentElement !== elt) {
                        elt.appendChild(item.element);
                      }

                      if (item === lastFrame) {
                        // Check how tall the content of the popover is
                        const titleEl = elt.querySelector(
                          "[class*='propTitle']"
                        );
                        const contentEl = elt.querySelector(
                          "[class*='contentWrap']"
                        );
                        if (titleEl && contentEl) {
                          setTitleContainer(titleEl);
                          setContentContainer(contentEl);
                        }
                      }
                    }
                  }}
                />
              </animated.div>
            );
          })}
        </div>
      </div>
    </OverlayProvider>,
    container
  );
}
