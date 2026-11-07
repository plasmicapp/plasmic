import sty from "@/wab/client/components/BottomModal.module.sass";
import {
  BottomPanelSessionContent,
  BottomPanelTabContext,
  useBottomPanel,
} from "@/wab/client/components/BottomPanel";
import {
  BottomPanelTabConfig,
  tabTitle,
} from "@/wab/client/components/BottomPanelState";
import { useConstant } from "@/wab/commons/components/ReactUtil";
import classNames from "classnames";
import { observer } from "mobx-react";
import React from "react";
import { FocusScope } from "react-aria";
import { animated, useSpring, useTransition } from "react-spring";
import { useMeasure } from "react-use";

/**
 * The stacked bottom modals used while the `dockview` devflag is off. Renders the same tab store as
 * <BottomPanel/>, newest in front.
 */
export const BottomModals = observer(function BottomModals() {
  const state = useBottomPanel();
  const modals = [...state.stack].reverse();
  const active = state.stack[state.stack.length - 1];
  const [focusedId, setFocusedId] = React.useState<string | undefined>();
  const [rootRef, rootSize] = useMeasure<HTMLDivElement>();

  React.useEffect(() => {
    setFocusedId(active?.id);
  }, [active?.buttonsTunnel]);
  // If the locally focused modal closes, bring the newest remaining modal forward. Use an updater
  // so a simultaneous activation update wins too.
  React.useEffect(() => {
    setFocusedId((current) => {
      if (!current || state.stack.some((entry) => entry.id === current)) {
        return current;
      }
      return state.stack[state.stack.length - 1]?.id;
    });
  }, [state.stack]);
  React.useEffect(() => {
    state.focused = focusedId !== undefined;
  }, [focusedId]);

  const focusedIndex = modals.findIndex((m) => m.id === focusedId);
  const transitions = useTransition(modals, {
    keys: (modal) => modal.id,
    from: { bottom: "-100%" },
    leave: { bottom: "-100%" },
    enter: { bottom: "0%" },
  });
  return (
    <div className={classNames(sty.ModalsRoot, "bottom-modals")} ref={rootRef}>
      {modals.length > 0 && focusedIndex >= 0 && (
        <div
          className={sty.ModalsMask}
          onClick={() => setFocusedId(undefined)}
        />
      )}
      {transitions((styles, modal, transitionState) => (
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
            key={modal.id}
          >
            <BottomModal
              config={modal}
              index={modals.indexOf(modal)}
              count={modals.length}
              focusedIndex={focusedIndex}
              canvasHeight={rootSize.height}
              onFocus={() => setFocusedId(modal.id)}
            />
          </animated.div>
        </div>
      ))}
    </div>
  );
});

const BottomModal = observer(function BottomModal(props: {
  config: BottomPanelTabConfig;
  /** Position in the stack, 0 being the newest and in front. */
  index: number;
  count: number;
  focusedIndex: number;
  canvasHeight: number;
  onFocus: () => void;
}) {
  const { config, index, count, focusedIndex, canvasHeight, onFocus } = props;
  const leftDelta = useConstant(() => Math.floor(10 - Math.random() * 20));
  const isCollapsed = focusedIndex < 0 || index > focusedIndex;
  const isFocused = focusedIndex === index;
  const height = canvasHeight * 0.9 - 60 * index;
  const top = isCollapsed
    ? canvasHeight - ((count - index) * 10 + 40)
    : canvasHeight - height;
  const animatedStyles = useSpring({ to: { top } });

  return (
    <animated.div
      // bottom-panel: shared with <BottomPanel/> for popover containment, click-away exceptions and
      // tests.
      className={classNames(sty.ModalRoot, "bottom-panel")}
      style={{ ...animatedStyles, height, left: 100 + leftDelta }}
      data-test-id="bottom-panel"
      onClick={() => {
        if (!isFocused) {
          onFocus();
        }
      }}
    >
      <div className={sty.ModalTitleContainer}>
        <div className={sty.ModalTitle}>{tabTitle(config)}</div>
        {isFocused && (
          <div className={sty.ModalActions}>
            <config.buttonsTunnel.Out />
          </div>
        )}
      </div>
      <FocusScope autoFocus>
        <div className={sty.ModalBody} data-test-id={config["data-test-id"]}>
          <BottomPanelTabContext.Provider value={config}>
            <BottomPanelSessionContent config={config} />
          </BottomPanelTabContext.Provider>
        </div>
      </FocusScope>
    </animated.div>
  );
});
