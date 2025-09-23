import { maybeShowContextMenu } from "@/wab/client/components/ContextMenu";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import sty from "@/wab/client/components/style-controls/KeyFrameStops.module.scss";
import { getHTMLElt } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import ColorStopIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__ColorStop";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import {
  ensure,
  ensureHTMLElt,
  insert,
  maybe,
  maybes,
  removeAt,
  spawn,
  tuple,
  withoutNils,
} from "@/wab/shared/common";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { AnimationSequence, KeyFrame } from "@/wab/shared/model/classes";
import { Menu } from "antd";
import classNames from "classnames";
import $ from "jquery";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";

interface KeyFrameStopsProps {
  sequence: AnimationSequence;
  studioCtx: StudioCtx;
  onSelectKeyframe: (keyframe: KeyFrame) => void;
  selectedKeyframe?: KeyFrame;
  onDeleteKeyframe?: (keyframe: KeyFrame) => void;
}

const KeyFrameStops_ = (props: KeyFrameStopsProps) => {
  const {
    sequence,
    studioCtx,
    onSelectKeyframe,
    selectedKeyframe,
    onDeleteKeyframe,
  } = props;
  const [removing, setRemoving] = React.useState(false);
  const [ghostLeftPct, setGhostLeftPct] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const stopsAndBarRef = React.useRef(null);
  const barRef = React.useRef(null);

  React.useEffect(() => {
    if (stopsAndBarRef.current) {
      $(getHTMLElt(stopsAndBarRef.current)).on("mouseout", () => {
        return setGhostLeftPct(null);
      });
    }
  }, []);

  const relOffset = React.useCallback(
    (e: React.MouseEvent) => {
      if (barRef.current) {
        const containerOffset = ensure(
          $(getHTMLElt(barRef.current)).offset(),
          "Element must have offset"
        );
        const barWidth = ensureHTMLElt(barRef.current).offsetWidth;
        const top = e.clientY - containerOffset.top;
        const left = e.clientX - containerOffset.left;
        const leftFrac = left / barWidth;
        const leftPct = Math.max(0, Math.min(100, 100 * leftFrac));
        return { top, left, leftFrac, leftPct };
      }
      return { top: 0, left: 0, leftFrac: 0, leftPct: 0 };
    },
    [barRef]
  );

  const handleChange = (f: () => any) => {
    spawn(
      studioCtx.change(({ success }) => {
        f();
        // Sort keyframes by percentage after any change
        sequence.keyframes.sort((a, b) => a.percentage - b.percentage);
        return success();
      })
    );
  };

  /**
   * Create a keyframe, but do not actually insert it, just return it with the
   * proposed index where it should be inserted.
   */
  const createKeyFrame = (pct: number) => {
    const roundedPct = Math.round(pct);

    // Find where to insert this keyframe
    let index = sequence.keyframes.findIndex(
      (kf) => roundedPct <= kf.percentage
    );
    if (index < 0) {
      index = sequence.keyframes.length;
    }

    // Do not insert at the exact same position as an existing KeyFrame
    if (sequence.keyframes.some((kf) => kf.percentage === roundedPct)) {
      return undefined;
    }

    const keyframe = new KeyFrame({
      percentage: roundedPct,
      rs: mkRuleSet({}),
    });

    return { index, keyframe };
  };

  // Render context menu for keyframe
  const renderKeyframeMenu = (keyframe: KeyFrame) => {
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      if (onDeleteKeyframe && sequence.keyframes.length > 1) {
        push(
          <Menu.Item key="delete" onClick={() => onDeleteKeyframe(keyframe)}>
            Delete keyframe
          </Menu.Item>
        );
      }
    });
    return builder.build({
      onMenuClick: (e) => e.domEvent.stopPropagation(),
      menuName: "keyframe-menu",
    });
  };

  // Create list of keyframes including potential ghost keyframe
  const keyframez = tuple(
    ...sequence.keyframes,
    maybes(ghostLeftPct)((g) => createKeyFrame(g))((x) => x.keyframe)()
  );
  const keyframes = withoutNils(keyframez);

  return (
    <div className={sty.keyframeStops}>
      <div ref={stopsAndBarRef} className={sty.stopsAndBar}>
        <div
          className={sty.barContainer}
          onMouseMove={(e) => {
            if (!isDragging) {
              const { leftPct } = relOffset(e);
              return setGhostLeftPct(leftPct);
            }
          }}
          onClick={(e) => {
            const { leftPct } = relOffset(e);
            const res = createKeyFrame(leftPct);
            if (res != null) {
              const { index, keyframe } = res;
              handleChange(() => {
                insert(sequence.keyframes, index, keyframe);
              });
              onSelectKeyframe(keyframe);
            }
          }}
        >
          {/* Percentage marks */}
          <div className={sty.marks}>
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className={sty.mark}
                style={{
                  left: `${pct}%`,
                }}
              >
                {pct}%
              </div>
            ))}
          </div>
          <div ref={barRef} className={sty.bar} />
        </div>
        <div className={sty.stops}>
          {keyframes.map((keyframe, keyframeNum) => {
            const isSelected = keyframe === selectedKeyframe;
            const isGhost = keyframeNum === sequence.keyframes.length;

            return (
              <div
                key={keyframeNum}
                className={sty.stopContainer}
                style={{
                  left: `${keyframe.percentage}%`,
                }}
              >
                <XDraggable
                  onMouseDown={() => !isGhost && onSelectKeyframe(keyframe)}
                  onStart={(_e) => {
                    if (!isGhost) {
                      studioCtx.startUnlogged();
                      setIsDragging(true);
                    }
                  }}
                  onDrag={(e) => {
                    if (isGhost) {
                      return;
                    }

                    const { top, leftPct } = relOffset(e.mouseEvent);
                    const prev = maybe(
                      sequence.keyframes[keyframeNum - 1],
                      (x) => x.percentage
                    );
                    const next = maybe(
                      sequence.keyframes[keyframeNum + 1],
                      (x) => x.percentage
                    );
                    const newRemoving = top > 90 || top < -30;
                    if (removing !== newRemoving) {
                      setRemoving(newRemoving);
                    }
                    const newVal = L.clamp(
                      Math.round(leftPct),
                      prev != null ? prev + 1 : 0,
                      next != null ? next - 1 : 100
                    );
                    if (keyframe.percentage !== newVal) {
                      handleChange(() => {
                        keyframe.percentage = newVal;
                      });
                    }
                  }}
                  onStop={(e) => {
                    if (isGhost) {
                      return;
                    }

                    const { top } = relOffset(e.mouseEvent);
                    setRemoving(false);
                    setIsDragging(false);
                    if (
                      sequence.keyframes.length > 1 &&
                      (top > 90 || top < -30)
                    ) {
                      handleChange(() => {
                        removeAt(sequence.keyframes, keyframeNum);
                      });
                      // Select another keyframe if we deleted the selected one
                      if (isSelected && sequence.keyframes.length > 0) {
                        const newIndex = Math.min(
                          keyframeNum,
                          sequence.keyframes.length - 1
                        );
                        onSelectKeyframe(sequence.keyframes[newIndex]);
                      }
                    }
                    studioCtx.stopUnlogged();
                  }}
                >
                  <div
                    className={classNames(sty.stop, {
                      [sty["stop--selected"]]: isSelected,
                      [sty["stop--removing"]]: isSelected && removing,
                      [sty["stop--ghost"]]: isGhost,
                    })}
                    onMouseDown={() => !isGhost && onSelectKeyframe(keyframe)}
                    onContextMenu={(e) => {
                      if (!isGhost) {
                        e.preventDefault();
                        maybeShowContextMenu(
                          e.nativeEvent,
                          renderKeyframeMenu(keyframe)
                        );
                      }
                    }}
                  >
                    <Icon
                      icon={ColorStopIcon}
                      className="keyframe-stop__icon"
                      size={24}
                    />
                    <div
                      className="keyframe-stop__percentage-chip"
                      style={{
                        backgroundColor: isSelected ? "#007acc" : "#fff",
                        color: isSelected ? "#fff" : "#333",
                        border: isGhost
                          ? "1px dashed #ccc"
                          : isSelected
                          ? "1px solid #007acc"
                          : "1px solid #ddd",
                      }}
                    >
                      {keyframe.percentage}%
                    </div>
                  </div>
                </XDraggable>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const KeyFrameStops = observer(KeyFrameStops_);
