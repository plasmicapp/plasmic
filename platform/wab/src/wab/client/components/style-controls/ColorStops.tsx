import { getHTMLElt } from "@/wab/client/components/view-common";
import { ColorPicker } from "@/wab/client/components/widgets/ColorPicker";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import { Icon } from "@/wab/client/components/widgets/Icon";
import ColorStopIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__ColorStop";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { tryParseTokenRef } from "@/wab/commons/StyleToken";
import {
  check,
  ensure,
  ensureHTMLElt,
  insert,
  maybe,
  maybes,
  removeAt,
  tuple,
  withoutNils,
} from "@/wab/shared/common";
import { Dim, LinearGradient, Stop } from "@/wab/shared/core/bg-styles";
import { allStyleTokensAndOverrides } from "@/wab/shared/core/sites";
import { Chroma } from "@/wab/shared/utils/color-utils";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import classNames from "classnames";
import $ from "jquery";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";

// Normally:
//
// angle=0 --> x=1=cos0, y=0=sin0
// angle=90 --> x=0=cos90, y=1=sin90
//
// But here 0deg = top and 90deg = right, so we want:
//
// angle=0 --> x=0=cos(90-0), y=1=sin(90-0)
// angle=90 --> x=1=cos(90-90), y=0=sin(90-90)
//
interface ColorStopsProps {
  stops: Stop[];
  onChange: (...args: any[]) => any;
  repeating: boolean;
  studioCtx: StudioCtx;
  vsh: VariantedStylesHelper;
}

const ColorStops_ = (props: ColorStopsProps) => {
  const [selectedStop, setSelectedStop] = React.useState(0);
  const [removing, setRemoving] = React.useState(false);
  const [ghostLeftPct, setGhostLeftPct] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const resolver = useClientTokenResolver();

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
        const colorStopsWidth = ensureHTMLElt(barRef.current).offsetWidth;
        const top = e.clientY - containerOffset.top;
        const left = e.clientX - containerOffset.left;
        const leftFrac = left / colorStopsWidth;
        const leftPct = 100 * leftFrac;
        return { top, left, leftFrac, leftPct };
      }
      return { top: 0, left: 0, leftFrac: 0, leftPct: 0 };
    },
    [barRef]
  );

  const realStopColor = (stop: Stop) => {
    const maybeToken = tryParseTokenRef(
      stop.color,
      allStyleTokensAndOverrides(props.studioCtx.site, { includeDeps: "all" })
    );
    if (maybeToken) {
      return resolver(maybeToken, props.vsh);
    }
    return stop.color;
  };

  const handleChange = (f: /*TWZ*/ () => any) => {
    f();
    return props.onChange(props.stops);
  };

  /**
   * Create a stop, but do not actually insert it, just return it with the
   * proposed index where it should be inserted.
   */
  const createStop = (pct: number) => {
    let color: string;
    let index = props.stops.findIndex((stop: /*TWZ*/ Stop | Stop) => {
      return pct <= stop.dim.value;
    });
    if (index < 0) {
      // Add to end, and reuse last stop's color
      index = props.stops.length;
      color = ensure(L.last(props.stops), "Stops must not be empty").color;
    } else if (index === 0) {
      color = props.stops[0].color;
    } else {
      const prev = props.stops[index - 1];
      const next = props.stops[index];
      color = Chroma.interpolate(
        realStopColor(prev),
        realStopColor(next),
        (pct - prev.dim.value) / (next.dim.value - prev.dim.value)
      ).hex();
    }
    const stop = new Stop(color, new Dim(Math.round(pct), "%"));
    // Do not insert at the exact same position as an existing Stop.
    if (
      maybe(props.stops[index - 1], (x: /*TWZ*/ Stop) => x.dim.value) ===
        stop.dim.value ||
      (props.stops[index] != null
        ? props.stops[index].dim.value
        : undefined) === stop.dim.value
    ) {
      return undefined;
    }
    // Ensure all stops would be in order
    const speculatedStops = insert(props.stops.slice(), index, stop);
    check(
      L(speculatedStops)
        .sortBy((_stop) => _stop.dim.value)
        .isEqual(speculatedStops)
    );
    // Ensure all stops have distinct values
    check(
      new Set(props.stops.map((s: /*TWZ*/ Stop | Stop) => s.dim.value)).size ===
        props.stops.length
    );
    return { index, stop };
  };

  const stopz = tuple(
    ...props.stops,
    maybes(ghostLeftPct)((g) => createStop(g))((x) => x.stop)()
  );
  const stops = withoutNils(stopz);
  return (
    <div className={"color-stops"}>
      <div ref={stopsAndBarRef} className={"color-stops__stops-and-bar"}>
        <div
          className={"color-stops__bar-container"}
          onMouseMove={(e) => {
            if (!isDragging) {
              const { leftPct } = relOffset(e);
              return setGhostLeftPct(leftPct);
            }
          }}
          onClick={(e) => {
            return handleChange(() => {
              const { leftPct } = relOffset(e);
              const res = createStop(leftPct);
              if (res != null) {
                const { index, stop } = res;
                insert(props.stops, index, stop);
                return setSelectedStop(index);
              }
            });
          }}
        >
          <div
            ref={barRef}
            className={"color-stops__bar"}
            style={{
              backgroundImage: new LinearGradient({
                angle: 90,
                stops: props.stops.map((s: Stop) => {
                  const derefStop = s.clone();
                  derefStop.color = realStopColor(s);
                  return derefStop;
                }),
                repeating: props.repeating,
              }).showCss(),
            }}
          />
        </div>
        <div className={"color-stops__stops"}>
          {stops.map((stop, stopNum) => {
            return (
              <div
                key={stopNum}
                className={"color-stop__container"}
                style={{
                  left: stop.dim.showCss(),
                }}
              >
                <XDraggable
                  onMouseDown={() => setSelectedStop(stopNum)}
                  onStart={(e) => {
                    props.studioCtx.startUnlogged();
                    return setIsDragging(true);
                  }}
                  onDrag={(e) => {
                    const { top, leftPct } = relOffset(e.mouseEvent);
                    const prev = maybe(
                      props.stops[stopNum - 1],
                      (x1) => x1.dim.value
                    );
                    const next = maybe(
                      props.stops[stopNum + 1],
                      (x2) => x2.dim.value
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
                    if (stop.dim.value !== newVal) {
                      return handleChange(() => {
                        return (stop.dim = new Dim(newVal, "%"));
                      });
                    }
                  }}
                  onStop={(e) => {
                    const { top } = relOffset(e.mouseEvent);
                    setRemoving(false);
                    setIsDragging(false);
                    if (stops.length > 1 && (top > 90 || top < -30)) {
                      return handleChange(() => {
                        if (selectedStop === stops.length - 1) {
                          setSelectedStop(stops.length - 2);
                        }
                        removeAt(props.stops, stopNum);
                      });
                    }
                    props.studioCtx.stopUnlogged();
                  }}
                >
                  <div
                    className={classNames({
                      "color-stop": true,
                      "color-stop--selected": selectedStop === stopNum,
                      "color-stop--removing":
                        selectedStop === stopNum && removing,
                      "color-stop--ghost": stopNum === props.stops.length,
                    })}
                    onMouseDown={() => setSelectedStop(stopNum)}
                  >
                    <Icon
                      icon={ColorStopIcon}
                      className="color-stop__icon monochrome-exempt"
                      size={24}
                    />
                    <div
                      className="color-stop__color-chip"
                      style={{
                        backgroundColor: realStopColor(stop),
                      }}
                    />
                  </div>
                </XDraggable>
              </div>
            );
          })}
        </div>
      </div>
      <ColorPicker
        key={selectedStop}
        color={props.stops[selectedStop].color}
        onChange={(color) => {
          return handleChange(() => {
            return (props.stops[selectedStop].color = color);
          });
        }}
        vsh={props.vsh}
      />
    </div>
  );
};

export const ColorStops = observer(ColorStops_);
