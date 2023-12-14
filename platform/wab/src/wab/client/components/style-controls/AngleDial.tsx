// So we should just be transforming the angle to 90 - angle.
import { PlainLinkButton } from "@/wab/client/components/widgets";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { deg2rad, ensure, rad2deg } from "@/wab/common";
import {
  XDraggable,
  XDraggableEvent,
} from "@/wab/commons/components/XDraggable";
import $ from "jquery";
import L from "lodash";
import * as React from "react";
import { useRef } from "react";
import Dial from "./Dial.svg";

function angleToOffset(angle: /*TWZ*/ number, radius: /*TWZ*/ number) {
  const x = radius * Math.cos(deg2rad(90 - angle));
  const y = radius * Math.sin(deg2rad(90 - angle));
  const left = radius + 5 + x;
  const top = radius + 5 - y;
  return { top, left };
}

function offsetToAngle({ top, left }: /*TWZ*/ { left: number; top: number }) {
  const x = left - 25;
  const y = -top + 25;
  // x = cos(90 - angle) --> angle = 90 - acos x
  const rawAngle = 90 - rad2deg(Math.atan(y / x));
  // tan is lossy; recover the correct angle.
  const correctedAngle = x < 0 ? 180 + rawAngle : rawAngle;
  // Wrap to 0-360
  const angle = (correctedAngle + 2 * 360) % 360;
  return angle;
}

const angleTicks = L.range(0, 360, 45);

interface AngleDialProps {
  angle: number;
  onChange: (...args: any[]) => any;
}

export function AngleDial({ angle, onChange }: AngleDialProps) {
  const studioCtx = useStudioCtx();

  const container = useRef<HTMLDivElement>(null);

  const track = (e: XDraggableEvent) => {
    const containerOffset = ensure($(ensure(container.current)).offset());
    const left = e.mouseEvent.pageX - containerOffset.left;
    const top = e.mouseEvent.pageY - containerOffset.top;
    const angle = offsetToAngle({ top, left });
    return onChange(angle);
  };
  const handleStart = (e: XDraggableEvent) => {
    studioCtx.startUnlogged();
    return track(e);
  };
  const handleDrag = (e: XDraggableEvent) => {
    return track(e);
  };
  const handleStop = () => {
    studioCtx.stopUnlogged();
  };
  return (
    <div className={"angle-dial"}>
      <div ref={container}>
        <div
          className={"angle-dial__dial"}
          style={{
            transform: `rotate(${angle}deg)`,
          }}
        >
          <XDraggable
            onStart={handleStart}
            onDrag={handleDrag}
            onStop={handleStop}
          >
            <img className={"angle-dial__dial-img"} src={Dial} />
          </XDraggable>
        </div>
      </div>

      <div className={"angle-dial__ticks-sheet"}>
        <div className={"angle-dial__ticks"}>
          {angleTicks.map((tick: /*TWZ*/ number) => {
            const { top, left } = angleToOffset(tick, 35);
            return (
              <div
                key={tick}
                className={"angle-dial__tick-container"}
                style={{ top, left }}
              >
                <PlainLinkButton
                  className={"angle-dial__tick"}
                  onClick={() => onChange(tick)}
                >
                  {tick}
                </PlainLinkButton>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
