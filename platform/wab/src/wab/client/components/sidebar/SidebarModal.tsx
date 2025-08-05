import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import { ModalScope } from "@/wab/client/components/widgets/ModalScope";
import { plasmicIFrameMouseDownEvent } from "@/wab/client/definitions/events";
import ArrowLeftIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowLeft";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import { STUDIO_SHORTCUTS } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { useInteractOutsideWithCommonExceptions } from "@/wab/commons/components/OnClickAway";
import { arrayReversed } from "@/wab/shared/collections";
import { cx, ensure } from "@/wab/shared/common";
import domAlign from "dom-align";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";
import { OverlayProvider, useOverlay } from "react-aria";
import ReactDOM from "react-dom";
import { animated, useTransition } from "react-spring";
import { usePrevious } from "react-use";
import ResizeObserver from "resize-observer-polyfill";

let nextId = 0;

function genId() {
  return nextId++;
}

interface Store {
  state: SidebarModalContextState;
  dispatch: React.Dispatch<Action>;
}

interface SidebarModalStackFrame {
  id: number;
  onClose?: () => void;
  element: HTMLDivElement;
  persistOnInteractOutside?: boolean;
}

interface SidebarModalContextState {
  containerSelector: string;
  stack: SidebarModalStackFrame[];
}
const SidebarModalContext = React.createContext<Store | undefined>(undefined);

function useSidebarModalContext() {
  return ensure(
    React.useContext(SidebarModalContext),
    "Unexpected nullish SidebarModalContext"
  );
}

interface PushAction {
  type: "push";
  frame: SidebarModalStackFrame;
}
interface PopAction {
  type: "pop";
  frameId: number;
}
interface PopAllAction {
  type: "popAll";
}

type Action = PushAction | PopAction | PopAllAction;

/**
 * A root component that "collects" modals into nestable screens. You should
 * have one per container where you want to collect and nest modals.  Modals
 * can be "nested" in that, in a modal content, you can embed another
 * <SidebarModal/>, which would
 *
 * @param props.containerSelector a css selector for the container element;
 *   the glass overlay and the modal will be added as child to that element.
 */
export function SidebarModalProvider(props: {
  containerSelector?: string;
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState(
    () =>
      ({
        containerSelector: props.containerSelector ?? ".app-container",
        stack: [],
      } as SidebarModalContextState)
  );

  const dispatch = React.useCallback(
    (action: Action) => {
      setState((_state) => {
        if (action.type === "push") {
          const existing = _state.stack.find((f) => f.id === action.frame.id);
          if (existing) {
            return {
              ..._state,
              stack: _state.stack.map((f) =>
                f === existing ? action.frame : f
              ),
            };
          } else {
            return {
              ..._state,
              stack: [..._state.stack, action.frame],
            };
          }
        } else if (action.type === "pop") {
          const popped = _state.stack.find((f) => f.id === action.frameId);
          if (popped) {
            popped.onClose && popped.onClose();
            return {
              ..._state,
              stack: _state.stack.filter((f) => f.id !== action.frameId),
            };
          }
        } else if (action.type === "popAll") {
          if (_state.stack.length > 0) {
            for (const frame of arrayReversed(_state.stack)) {
              frame.onClose && frame.onClose();
            }

            return { ..._state, stack: [] };
          }
        }

        return _state;
      });
    },
    [setState]
  );

  const store = React.useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return (
    <SidebarModalContext.Provider value={store}>
      <SidebarModalShell />
      {props.children}
    </SidebarModalContext.Provider>
  );
}

/**
 * Creates a sidebar modal.
 */
export function SidebarModal(
  props: {
    show?: boolean;
  } & Omit<React.ComponentProps<typeof SidebarModalInternal>, "frameId">
) {
  const { show, children, ...restProps } = props;

  // The same modal will always have the same frameId.
  const [frameId] = React.useState(genId());
  if (show) {
    return (
      <SidebarModalInternal frameId={frameId} {...restProps}>
        {children}
      </SidebarModalInternal>
    );
  } else {
    return null;
  }
}

const SidebarModalInternal = observer(function SidebarModalInternal(props: {
  frameId: number;
  title?: React.ReactNode;
  children?: React.ReactNode;
  onClose?: () => void;
  dismissOnEnter?: boolean;
  persistOnInteractOutside?: boolean;
  hideTitleSection?: boolean;
  hideCloseIcon?: boolean;
}) {
  // This component doesn't actually render anything; instead,
  // it dispatches push and pop actions to the SidebarModalContext
  // store to add and pop modal contents.  It is SidebarModalShell
  // that will be picking up those new frames and rendering the
  // new modals.
  const {
    frameId,
    title,
    children,
    onClose,
    dismissOnEnter,
    persistOnInteractOutside,
    hideTitleSection,
    hideCloseIcon,
  } = props;

  const [element] = React.useState(() => {
    const elt = document.createElement("div");
    elt.classList.add("flex-col");
    elt.classList.add("overflow-hidden");
    return elt;
  });

  const { state, dispatch } = useSidebarModalContext();
  const frame = React.useMemo(
    () =>
      ({
        id: frameId,
        onClose,
        element,
        persistOnInteractOutside,
      } as SidebarModalStackFrame),
    [frameId, onClose, element]
  );

  // We push the modal content whenever it changes
  React.useEffect(() => {
    dispatch({ type: "push", frame });
  }, [frame]);

  // We pop the modal content only when we unmount
  React.useEffect(() => {
    return () => {
      dispatch({ type: "pop", frameId });
    };
  }, [frameId]);

  // We want to be rendering the modal content in a portal here, so that
  // in the React tree, the portal content will be a child of the parent
  // component.  We render to an unattached element, and SidebarModalShell
  // will be attaching it to the DOM tree.
  return ReactDOM.createPortal(
    // We use FocusScope to keep keyboard focus (via TAB) within
    // the modal, so you cannot tab out of the modal.  However,
    // if persistOnInteractOutside is true, this is a long-lived modal,
    // so we allow the focus to travel outside of the modal as well
    <ModalScope
      className="flex-col"
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
            dispatch({ type: "pop", frameId });
          }
        }}
      >
        <div
          className="panel-popup-title"
          style={{
            display: hideTitleSection ? "none" : undefined,
          }}
        >
          {frame?.element !== state.stack[0]?.element && (
            <IconButton
              type="seamless"
              className="mr-ch"
              data-test-id={"back-sidebar-modal"}
              onClick={() => dispatch({ type: "pop", frameId: frameId })}
            >
              <Icon icon={ArrowLeftIcon} />
            </IconButton>
          )}
          {title && (
            <div className="flex flex-fill flex-vcenter strong text-xlg tight-line-height list-item-height">
              {title}
            </div>
          )}
          {!hideCloseIcon && (
            <IconButton
              type="seamless"
              onClick={() => dispatch({ type: "popAll" })}
              className="flex-push-right"
              data-test-id="close-sidebar-modal"
            >
              <Icon icon={CloseIcon} />
            </IconButton>
          )}
        </div>
        <div className={cx("panel-popup-content", "rel")}>
          <div className="panel-popup-content-inner">{children}</div>
        </div>
      </div>
    </ModalScope>,
    element
  );
});

function SidebarModalShell() {
  const popupRef = React.useRef<HTMLDivElement>(null);
  const { state, dispatch } = useSidebarModalContext();
  const { containerSelector, stack } = state;
  const lastFrame = L.last(stack);

  const [modalHeight, setModalHeight] = React.useState(0);
  const container = document.querySelector(containerSelector);
  const [minHeight, setMinHeight] = React.useState(
    container ? Math.min(modalHeight, container.clientHeight - 50) : undefined
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
      const newModalHeight =
        titleContainer.getBoundingClientRect().height +
        contentContainer.getBoundingClientRect().height +
        4;
      const newMinHeight = Math.min(
        newModalHeight,
        container.clientHeight - 50
      );
      setMinHeight(newMinHeight);
      setModalHeight(newModalHeight);
    });

    _observer.observe(titleContainer);
    _observer.observe(contentContainer);
    _observer.observe(container);

    return () => _observer.disconnect();
  }, [container, contentContainer, titleContainer]);

  // We use @react-aria's useOverlay to catch Escape.  We don't use
  // it for catching clicks outside the modal because it always closes
  // the overlay on any click outside popupRef, including clicks on
  // menus, selects, and other overlay divs.  So instead, we do this
  // ourselves with our own call to `useInteractOutside()`.
  const { overlayProps } = useOverlay(
    {
      isOpen: !!lastFrame,
      isDismissable: false,
      onClose: () =>
        lastFrame && dispatch({ type: "pop", frameId: lastFrame.id }),
    },
    popupRef
  );

  useInteractOutsideWithCommonExceptions({
    ref: popupRef,
    onInteractOutside: () => {
      if (lastFrame?.persistOnInteractOutside) {
        return;
      }

      dispatch({ type: "popAll" });
    },
  });

  React.useEffect(() => {
    const onHide = () => {
      if (lastFrame?.persistOnInteractOutside) {
        return;
      }
      dispatch({ type: "popAll" });
    };
    document.addEventListener(plasmicIFrameMouseDownEvent, onHide);
    return () => {
      document.removeEventListener(plasmicIFrameMouseDownEvent, onHide);
    };
  }, [dispatch, lastFrame]);

  // We transition modal content left and right, so that when you pop
  // up a new modal, the existing modal shifts left and the new modal
  // slides in from the right.  When you click the "back" button, the same
  // happens but in reverse -- the existing modal shifts right and the
  // previous modal slides in from the left.
  //
  // Note, however, that we do not want to _unmount_ the previous modals
  // currently on the stack!  That's because the modals are "nested" --
  // you usually have a <SidebarModal> whose _descendant_ has another
  // <SidebarModal> whose _descendant_ has another <SidebarModal>, etc.;
  // so we need to keep the previous modals mounted -- otherwise, unmounting
  // the previous modal will also unmount the modal we are trying to display!
  const isEmpty = state.stack.length === 0;
  const wasEmpty = usePrevious(isEmpty);
  // Using left instead of transform, as transform would glitch out a lot more :-/
  const displayedEffect = { left: "0%" }; // { transform: "translate3d(0%,0,0)" };
  const preemptedEffect = { left: "-105%" }; // { transform: "translate3d(-105%,0,0)" };
  const closedEffect = { left: "105%" }; // { transform: "translate3d(105%,0,0)" };
  const transitions = useTransition(state.stack, {
    // If this is the very first modal, then we start out without
    // any animation.
    from: wasEmpty ? displayedEffect : closedEffect,
    enter: displayedEffect,
    leave: closedEffect,
    keys: (frame) => frame.id,
    // When a new modal is added, then we slide the existing modals
    // to the left (preemptedEffect) and display the new one.
    update: (item) => (item === lastFrame ? displayedEffect : preemptedEffect),
    unique: true,
  });

  // Position the popup within the container
  React.useEffect(() => {
    const popup = popupRef.current;
    if (!popup) {
      return;
    }
    const pane = ensure(
      document.querySelector(containerSelector),
      "Unexpected nullish SidebarModal containerSelector"
    );
    domAlign(popup, pane, {
      points: ["tc", "tc"],
      offset: [0, 40],
    });
  }, [isEmpty, containerSelector]);

  if (!lastFrame || !container) {
    // Nothing to display
    return null;
  }

  return ReactDOM.createPortal(
    <OverlayProvider>
      <div className={cx("right-pane__mask auto-pointer-events")}>
        <div
          ref={popupRef}
          id="sidebar-modal"
          className={cx("dev-env panel-popup absolute")}
          style={{ minHeight: minHeight }}
          {...overlayProps}
        >
          {transitions((_props, item) => (
            <animated.div
              key={item.id}
              className="flex-col"
              style={{
                position: "absolute",
                overflow: "hidden",
                top: 0,
                width: "100%",
                height: "100%",
                ..._props,
              }}
            >
              <div
                className="flex-col overflow-hidden"
                ref={(elt) => {
                  if (elt) {
                    // We attach the portal modal content rendered by SidebarModal
                    // to the DOM tree here, if it hasn't been yet.  Note that
                    // if item.element.childElementCount has been unmounted, then
                    // it will be empty; but we want the unmounting animation to
                    // still show the unmounted DOM tree though.  So we keep a clone
                    // of the modal content, and display the cloned element when
                    // it has been unmounted.
                    if (item.element.childElementCount === 0) {
                      if (item.element.parentElement === elt) {
                        elt.removeChild(item.element);
                      }
                      elt.appendChild(
                        ensure(
                          clonedModalContent.get(item.element),
                          "Unexpected nullish element from clonedModalContent"
                        )
                      );
                    } else {
                      clonedModalContent.set(
                        item.element,
                        item.element.cloneNode(true) as HTMLElement
                      );
                      if (item.element.parentElement !== elt) {
                        elt.appendChild(item.element);
                      }
                    }
                    if (item === lastFrame) {
                      // Check how tall the content of the modal is.  We reach into
                      // .panel-popup-content-inner, to bypass any scrolling containers.
                      setTitleContainer(
                        ensure(
                          elt.querySelector(".panel-popup-title"),
                          "Unexpected nullish title container"
                        )
                      );
                      setContentContainer(
                        ensure(
                          elt.querySelector(".panel-popup-content-inner"),
                          "Unexpected nullish content container"
                        )
                      );
                    }
                  }
                }}
              />
            </animated.div>
          ))}
        </div>
      </div>
    </OverlayProvider>,
    container
  );
}

const clonedModalContent = new WeakMap<HTMLElement, HTMLElement>();
