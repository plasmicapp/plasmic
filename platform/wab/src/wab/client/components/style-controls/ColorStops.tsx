import { Dim, LinearGradient, Stop } from "@/wab/bg-styles";
import { getHTMLElt } from "@/wab/client/components/view-common";
import { ColorPicker } from "@/wab/client/components/widgets/ColorPicker";
import { Icon } from "@/wab/client/components/widgets/Icon";
import ColorStopIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__ColorStop";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
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
} from "@/wab/common";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { derefTokenRefs } from "@/wab/commons/StyleToken";
import { Chroma } from "@/wab/shared/utils/color-utils";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { allStyleTokens } from "@/wab/sites";
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
type ColorStopsState = {
  selectedStop: number;
  removing: boolean;
  ghostLeftPct: number | null;
  isDragging: boolean;
};
class ColorStops_ extends React.Component<ColorStopsProps, ColorStopsState> {
  isHoveringStop: boolean;
  constructor(props) {
    super(props);
    this.isHoveringStop = false;
    this.state = {
      selectedStop: 0,
      removing: false,
      ghostLeftPct: null,
      isDragging: false,
    };
  }
  componentDidMount() {
    return $(getHTMLElt(this.refs.stopsAndBarArea)).on("mouseout", () => {
      return this.setState({ ghostLeftPct: null });
    });
  }
  handleChange = (f: /*TWZ*/ () => any) => {
    f();
    return this.props.onChange(this.props.stops);
  };
  //replaceStop: ->
  //  @props.onChange(
  //    Immutable.Vec(@props.stops).set(@state.selectedStop, color).toArray()
  //  )
  private get colorStopsWidth() {
    return ensureHTMLElt(this.refs.bar).offsetWidth;
  }
  relOffset = (e: React.MouseEvent) => {
    const containerOffset = ensure(
      $(getHTMLElt(this.refs.bar)).offset(),
      "Element must have offset"
    );
    const top = e.clientY - containerOffset.top;
    const left = e.clientX - containerOffset.left;
    const leftFrac = left / this.colorStopsWidth;
    const leftPct = 100 * leftFrac;
    return { top, left, leftFrac, leftPct };
  };
  /**
   * Create a stop, but do not actually insert it, just return it with the
   * proposed index where it should be inserted.
   */
  createStop = (pct: number) => {
    let color: string;
    let index = this.props.stops.findIndex((stop: /*TWZ*/ Stop | Stop) => {
      return pct <= stop.dim.value;
    });
    if (index < 0) {
      // Add to end, and reuse last stop's color
      index = this.props.stops.length;
      color = ensure(L.last(this.props.stops), "Stops must not be empty").color;
    } else if (index === 0) {
      color = this.props.stops[0].color;
    } else {
      const prev = this.props.stops[index - 1];
      const next = this.props.stops[index];
      color = Chroma.interpolate(
        this.realStopColor(prev),
        this.realStopColor(next),
        (pct - prev.dim.value) / (next.dim.value - prev.dim.value)
      ).hex();
    }
    const stop = new Stop(color, new Dim(Math.round(pct), "%"));
    // Do not insert at the exact same position as an existing Stop.
    if (
      maybe(this.props.stops[index - 1], (x: /*TWZ*/ Stop) => x.dim.value) ===
        stop.dim.value ||
      (this.props.stops[index] != null
        ? this.props.stops[index].dim.value
        : undefined) === stop.dim.value
    ) {
      return undefined;
    }
    // Ensure all stops would be in order
    const speculatedStops = insert(this.props.stops.slice(), index, stop);
    check(
      L(speculatedStops)
        .sortBy((_stop) => _stop.dim.value)
        .isEqual(speculatedStops)
    );
    // Ensure all stops have distinct values
    check(
      new Set(this.props.stops.map((s: /*TWZ*/ Stop | Stop) => s.dim.value))
        .size === this.props.stops.length
    );
    return { index, stop };
  };
  render() {
    const stopz = tuple(
      ...this.props.stops,
      maybes(this.state.ghostLeftPct)((g) => this.createStop(g))(
        (x) => x.stop
      )()
    );
    const stops = withoutNils(stopz);
    return (
      <div className={"color-stops"}>
        <div ref={"stopsAndBarArea"} className={"color-stops__stops-and-bar"}>
          <div
            className={"color-stops__bar-container"}
            onMouseMove={(e) => {
              //if @isHoveringStop
              //  @setState(ghostLeftPct: null)
              //else if not e.buttons
              if (!this.state.isDragging) {
                const { leftPct } = this.relOffset(e);
                return this.setState({ ghostLeftPct: leftPct });
              }
            }}
            onClick={(e) => {
              return this.handleChange(() => {
                const { leftPct } = this.relOffset(e);
                const res = this.createStop(leftPct);
                if (res != null) {
                  const { index, stop } = res;
                  insert(this.props.stops, index, stop);
                  return this.setState({ selectedStop: index });
                }
              });
            }}
          >
            <div
              ref={"bar"}
              className={"color-stops__bar"}
              style={{
                backgroundImage: new LinearGradient({
                  angle: 90,
                  stops: this.props.stops.map((s: Stop) => {
                    const derefStop = s.clone();
                    derefStop.color = this.realStopColor(s);
                    return derefStop;
                  }),
                  repeating: this.props.repeating,
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
                    onMouseDown={() => this.setState({ selectedStop: stopNum })}
                    onStart={(e) => {
                      this.props.studioCtx.startUnlogged();
                      return this.setState({ isDragging: true });
                    }}
                    onDrag={(e) => {
                      const { top, leftPct } = this.relOffset(e.mouseEvent);
                      const prev = maybe(
                        this.props.stops[stopNum - 1],
                        (x1) => x1.dim.value
                      );
                      const next = maybe(
                        this.props.stops[stopNum + 1],
                        (x2) => x2.dim.value
                      );
                      const newRemoving = top > 90 || top < -30;
                      if (this.state.removing !== newRemoving) {
                        this.setState({ removing: newRemoving });
                      }
                      const newVal = L.clamp(
                        Math.round(leftPct),
                        prev != null ? prev + 1 : 0,
                        next != null ? next - 1 : 100
                      );
                      if (stop.dim.value !== newVal) {
                        return this.handleChange(() => {
                          return (stop.dim = new Dim(newVal, "%"));
                        });
                      }
                    }}
                    onStop={(e) => {
                      const { top } = this.relOffset(e.mouseEvent);
                      this.setState({
                        removing: false,
                        isDragging: false,
                      });
                      if (stops.length > 1 && (top > 90 || top < -30)) {
                        return this.handleChange(() => {
                          if (this.state.selectedStop === stops.length - 1) {
                            this.setState({ selectedStop: stops.length - 2 });
                          }
                          removeAt(this.props.stops, stopNum);
                        });
                      }
                      this.props.studioCtx.stopUnlogged();
                    }}
                  >
                    <div
                      className={classNames({
                        "color-stop": true,
                        "color-stop--selected":
                          this.state.selectedStop === stopNum,
                        "color-stop--removing":
                          this.state.selectedStop === stopNum &&
                          this.state.removing,
                        "color-stop--ghost":
                          stopNum === this.props.stops.length,
                      })}
                      onMouseDown={
                        () => this.setState({ selectedStop: stopNum })
                        //onMouseEnter: => @isHoveringStop = true
                        //onMouseLeave: => @isHoveringStop = false
                      }
                    >
                      <Icon
                        icon={ColorStopIcon}
                        className="color-stop__icon monochrome-exempt"
                        size={24}
                      />
                      <div
                        className="color-stop__color-chip"
                        style={{
                          backgroundColor: this.realStopColor(stop),
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
          key={this.state.selectedStop}
          color={this.props.stops[this.state.selectedStop].color}
          onChange={(color) => {
            return this.handleChange(() => {
              return (this.props.stops[this.state.selectedStop].color = color);
            });
          }}
          vsh={this.props.vsh}
        />
      </div>
    );
  }

  private realStopColor(stop: Stop) {
    return derefTokenRefs(
      allStyleTokens(this.props.studioCtx.site, { includeDeps: "all" }),
      stop.color,
      this.props.vsh
    );
  }
}

export const ColorStops = observer(ColorStops_);
