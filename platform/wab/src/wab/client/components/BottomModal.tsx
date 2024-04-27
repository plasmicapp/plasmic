import sty from "@/wab/client/components/BottomModal.module.sass";
import { ensure } from "@/wab/common";
import { useConstant } from "@/wab/commons/components/ReactUtil";
import classNames from "classnames";
import { omit, size } from "lodash";
import React, { Dispatch, Reducer } from "react";
import { FocusScope } from "react-aria";
import { animated, useSpring, useTransition } from "react-spring";
import { useMeasure } from "react-use";
import tunnel from "tunnel-rat";

interface BottomModalsStore {
  state: BottomModalsState;
  dispatch: Dispatch<BottomModalsAction>;
}

interface BottomModalsPushAction {
  type: "push";
  id: string;
  config: BottomModalConfig;
}

interface BottomModalsPopAction {
  type: "pop";
  id: string;
}

interface BottomModalsFocusAction {
  type: "focus";
  focusedIndex?: number;
}

type BottomModalsAction =
  | BottomModalsPushAction
  | BottomModalsPopAction
  | BottomModalsFocusAction;

export function BottomModalsProvider(props: { children?: React.ReactNode }) {
  const [state, dispatch] = React.useReducer<
    Reducer<BottomModalsState, BottomModalsAction>
  >(
    (curState, action) => {
      switch (action.type) {
        case "push": {
          const newModals = {
            [action.id]: action.config,
            ...omit(curState.modals, action.id),
          };
          return {
            modals: newModals,
            focusedIndex: 0,
          };
        }
        case "pop": {
          const newFocus =
            curState.focusedIndex !== undefined
              ? curState.focusedIndex - 1
              : undefined;
          return {
            modals: omit(curState.modals, action.id),
            focusedIndex:
              newFocus != null && newFocus >= 0 ? newFocus : undefined,
          };
        }
        case "focus": {
          return {
            ...curState,
            focusedIndex: action.focusedIndex,
          };
        }
      }
    },
    {
      focusedIndex: undefined,
      modals: {},
    }
  );

  const store = React.useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <BottomModalsContext.Provider value={store}>
      {props.children}
    </BottomModalsContext.Provider>
  );
}

function useBottomModalsContext() {
  return ensure(
    React.useContext(BottomModalsContext),
    `Missing <BottomModalsProvider/>`
  );
}

export function useBottomModalActions() {
  const ctx = useBottomModalsContext();
  const actions = React.useMemo(
    () => ({
      open(id: string, props: BottomModalProps) {
        ctx.dispatch({
          type: "push",
          id,
          config: {
            ...props,
            buttonsTunnel: tunnel(),
          },
        });
      },
      close(id: string) {
        ctx.dispatch({
          type: "pop",
          id,
        });
      },
    }),
    [ctx]
  );
  return actions;
}

interface BottomModalsState {
  focusedIndex?: number;
  modals: Record<string, BottomModalConfig>;
}

const BottomModalsContext = React.createContext<BottomModalsStore | undefined>(
  undefined
);

const BottomModalContext = React.createContext<BottomModalConfig | undefined>(
  undefined
);

interface BottomModalProps {
  children?: React.ReactNode;
  title?: React.ReactNode;
}

interface BottomModalConfig extends BottomModalProps {
  buttonsTunnel: ReturnType<typeof tunnel>;
}

export function BottomModal(props: BottomModalProps & { modalKey: string }) {
  const { children, title, modalKey } = props;
  const { dispatch } = useBottomModalsContext();
  const buttonsTunnel = React.useMemo(() => tunnel(), []);
  React.useEffect(() => {
    dispatch({
      type: "push",
      id: modalKey,
      config: { children, title, buttonsTunnel },
    });
  }, [modalKey, children, title, buttonsTunnel]);
  React.useEffect(() => {
    return () => dispatch({ type: "pop", id: modalKey });
  }, []);
  return null;
}

interface BottomModalsProps {
  onFocusedIndexChange?: (newIndex: number | undefined) => void;
}

export function BottomModals({ onFocusedIndexChange }: BottomModalsProps) {
  const store = useBottomModalsContext();
  const { state, dispatch } = store;
  const [rootRef, rootSize] = useMeasure<HTMLDivElement>();
  const transitions = useTransition(Object.entries(state.modals), {
    keys: ([id]) => id,
    from: { bottom: "-100%" },
    leave: { bottom: "-100%" },
    enter: { bottom: "0%" },
  });
  React.useEffect(() => {
    onFocusedIndexChange?.(state.focusedIndex);
  }, [state.focusedIndex]);
  return (
    <div className={classNames(sty.ModalsRoot, "bottom-modals")} ref={rootRef}>
      {size(state.modals) > 0 && state.focusedIndex !== undefined && (
        <div
          className={classNames(sty.ModalsMask, {
            [sty.ModalsMask__collapsed]: state.focusedIndex == null,
          })}
          onClick={() => dispatch({ type: "focus", focusedIndex: undefined })}
        />
      )}
      {transitions((styles, [id, modal], transitionState) => (
        // TODO: remove this div and see if chrome render is still broken
        <div
          style={{
            overflow: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <animated.div
            style={{
              ...styles,
              position: "absolute",
              height: "100%",
              width: "100%",
              pointerEvents: "none",
            }}
            className={`animated-bottom-modal-${transitionState.phase}`}
            key={id}
          >
            <BottomModalInternal
              key={id}
              id={id}
              config={modal}
              store={store}
              canvasHeight={rootSize.height}
            />
          </animated.div>
        </div>
      ))}
    </div>
  );
}

function BottomModalInternal(props: {
  config: BottomModalConfig;
  store: BottomModalsStore;
  id: string;
  canvasHeight: number;
}) {
  const { config, store, id, canvasHeight } = props;
  const { title, children } = config;
  const { state, dispatch } = store;
  const leftDelta = useConstant(() => Math.floor(10 - Math.random() * 20));
  const index = Object.keys(state.modals).indexOf(id);
  if (index < 0) {
    // Happens when unmounting and animating out this modal
  }

  const count = size(state.modals);
  const isCollapsed = state.focusedIndex == null || index > state.focusedIndex;
  const isFocused = state.focusedIndex === index;
  const height = canvasHeight * 0.9 - 60 * index;
  const top = isCollapsed
    ? canvasHeight - ((count - index) * 10 + 40)
    : canvasHeight - height;
  const animatedStyles = useSpring({ to: { top } });

  return (
    <animated.div
      className={sty.ModalRoot}
      style={{ ...animatedStyles, height, left: 100 + leftDelta }}
      onClick={() => {
        if (!isFocused) {
          dispatch({ type: "focus", focusedIndex: index });
        }
      }}
    >
      <div className={sty.ModalTitleContainer}>
        <div className={sty.ModalTitle}>{title}</div>
        {isFocused && (
          <div className={sty.ModalActions}>
            <config.buttonsTunnel.Out />
          </div>
        )}
      </div>
      <FocusScope autoFocus>
        <div className={sty.ModalBody}>
          <BottomModalContext.Provider value={config}>
            {children}
          </BottomModalContext.Provider>
        </div>
      </FocusScope>
    </animated.div>
  );
}

export function BottomModalButtons(props: { children?: React.ReactNode }) {
  const config = ensure(
    React.useContext(BottomModalContext),
    "BottomModalButtons can only be used in a BottomModal"
  );

  return <config.buttonsTunnel.In>{props.children}</config.buttonsTunnel.In>;
}
