import { LabeledStyleDimItem } from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  getLabelForStyleName,
  StyleComponent,
  StyleComponentProps,
} from "@/wab/client/components/style-controls/StyleComponent";
import { DimTokenSpinnerRef } from "@/wab/client/components/widgets/DimTokenSelector";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import {
  INTERACT_OUTSIDE_EXCEPTION_SELECTORS,
  OnClickAwayExcept,
} from "@/wab/commons/components/OnClickAway";
import { Stated } from "@/wab/commons/components/Stated";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { lazyDerefTokenRefsWithDeps } from "@/wab/commons/StyleToken";
import {
  ensure,
  hackyCast,
  simpleWords,
  toggleSet,
  tuple,
  unexpected,
} from "@/wab/shared/common";
import {
  getCssInitial,
  parseCssShorthand,
  showCssShorthand,
} from "@/wab/shared/css";
import {
  createNumericSize,
  isDraggableSize,
  NumericSize,
  parseNumericSize,
  showSizeCss,
} from "@/wab/shared/css-size";
import { LENGTH_PERCENTAGE_UNITS } from "@/wab/shared/css/types";
import { oppSide, Side, standardSides } from "@/wab/shared/geom";
import { Popover, Tooltip } from "antd";
import { TooltipPlacement } from "antd/lib/tooltip";
import cn from "classnames";
import * as Immutable from "immutable";
import { observer } from "mobx-react";
import { createRef, default as React, ReactNode } from "react";
import defer = setTimeout;

function closeLoop(pointsStr: /*TWZ*/ string) {
  const points = simpleWords(pointsStr);
  return tuple(...[...points], points[0]).join(" ");
}

interface SpacingControlState {
  justDragged: boolean;
  showPopover: boolean;
  xThickness?: number;
  yThickness?: number;
  selection: { sides: Immutable.Set<string> };
}

interface SpacingControlProps extends StyleComponentProps {
  excludePadding?: boolean;
  spacingStyleProp: string;
  label?: ReactNode;
  subtitle?: ReactNode;
  popoverPlacement?: TooltipPlacement;
  // whether allow the size to be "auto". This is allowed for margin, which
  // can be used to center the element.
  allowAuto?: boolean;
}

class SpacingControl_ extends StyleComponent<
  SpacingControlProps,
  SpacingControlState
> {
  private toFocus = false;
  private spinner = createRef<DimTokenSpinnerRef>();
  private popoverContainer = createRef<HTMLDivElement>();
  private container = createRef<HTMLDivElement>();
  private topPart = createRef<SVGPolylineElement>();
  private leftPart = createRef<SVGPolylineElement>();

  private shouldIgnoreSpinnerBlur = false;
  private clearSidesIfSelectionChanges = false;

  constructor(props) {
    super(props);

    this.state = {
      justDragged: false,
      showPopover: false,
      selection: {
        sides: Immutable.Set(),
      },
    };
  }

  componentDidMount() {
    if (this.topPart.current && !this.state.yThickness) {
      const yThickness = this.topPart.current.getBoundingClientRect().height;
      this.setState({ yThickness });
    }
    if (this.leftPart.current && !this.state.xThickness) {
      const xThickness = this.leftPart.current.getBoundingClientRect().width;
      this.setState({ xThickness });
    }
  }
  componentDidUpdate() {
    if (this.toFocus && this.spinner.current) {
      this.toFocus = false;
      this.spinner.current.focus();
    }
  }

  private handleSpinnerFocus = () => {
    this.setState({ showPopover: true });
  };

  private handleSpinnerBlur = () => {
    if (!this.shouldIgnoreSpinnerBlur) {
      this.setState({ showPopover: false });
    }
  };

  private changeSelectionSingle = (
    side: /*TWZ*/ string,
    { mode }: /*TWZ*/ { mode: string }
  ) => {
    const oldSel = this.state.selection;
    // Toggle selection state
    const sides: Immutable.Set<string> = (() => {
      switch (mode) {
        case "toggle":
          return toggleSet(oldSel.sides, side);
        case "add":
          if (!oldSel.sides.has(side)) {
            return Immutable.Set([side]);
          } else {
            return oldSel.sides;
          }
        default:
          return unexpected();
      }
    })();
    this.changeSelection(sides);
  };

  private changeSelection(sides: Immutable.Set<string>) {
    if (sides.size > 0) {
      this.toFocus = true;
    }
    this.setState({
      selection: {
        sides: sides,
      },
    });
  }

  handleClick = (e: React.MouseEvent<SVGPolylineElement>, side: Side) => {
    if (this.clearSidesIfSelectionChanges) {
      this.clearSidesIfSelectionChanges = false;
      return this.changeSelection(Immutable.Set([side]));
    }

    switch (hackyCast(e).detail) {
      case 1:
        if (!this.state.justDragged) {
          this.changeSelectionSingle(side, { mode: "toggle" });
        } else {
          this.setState({ justDragged: false });
        }
        break;
      case 2:
        this.changeSelection(Immutable.Set([side, oppSide(side)]));
        break;
      default:
        this.changeSelection(Immutable.Set(standardSides));
        break;
    }
  };

  private selectedStyleProps() {
    return this.selectedSides().map(
      (side) => `${this.props.spacingStyleProp}-${side}`
    );
  }

  private selectedSides() {
    return this.state.selection.sides.isEmpty()
      ? [...standardSides]
      : [...this.state.selection.sides];
  }

  showSelectedValues() {
    const isAll = this.state.selection.sides.isEmpty();
    const props = this.selectedStyleProps();
    const values = props.map((prop) => this.exp().get(prop));
    if (isAll) {
      return showCssShorthand(values);
    } else if (new Set(values).size === 1) {
      return values[0];
    } else {
      return "";
    }
  }

  setAllSelected = (val: string) => {
    const isAll = this.state.selection.sides.isEmpty();
    const props = this.selectedStyleProps();
    return this.change(() => {
      if (isAll) {
        const newVals = parseCssShorthand(val);
        props.forEach((prop, i) => this.exp().set(prop, newVals[i]));
      } else {
        props.forEach((prop) => this.exp().set(prop, val));
      }
    });
  };

  clearAllSelected = () => {
    const props = this.selectedStyleProps();
    return this.change(() => {
      props.forEach((prop) => this.exp().clear(prop));
    });
  };

  /**
   * Returns the value that all selected sides are equal to, or undefined if
   * no sides selected or if not all sides have the same value.
   */
  getMultiSelectedValue() {
    const sel = this.state.selection;
    const values = sel.sides
      .toArray()
      .map((side) => this.exp().get(`${this.props.spacingStyleProp}-${side}`));
    return new Set(values).size === 1 ? values[0] : undefined;
  }

  render() {
    const {
      spacingStyleProp,
      popoverPlacement = "top",
      label,
      subtitle,
    } = this.props;
    const spacingLabel = label || getLabelForStyleName(spacingStyleProp);
    const vsh =
      this.props.vsh ??
      makeVariantedStylesHelperFromCurrentCtx(this.studioCtx());

    return (
      <OnClickAwayExcept
        getAllowedContainers={() => {
          const container = this.container.current;
          const popoverContainer = this.popoverContainer.current;
          function* gen() {
            if (popoverContainer) {
              yield* Array.from(
                popoverContainer.querySelectorAll(
                  "polyline.spacing-control__handle"
                )
              );
            }
            if (container) {
              yield* Array.from(
                container.querySelectorAll(`[data-plasmic-role="labeled-item"]`)
              );
            }
            yield* Array.from(
              document.querySelectorAll(
                INTERACT_OUTSIDE_EXCEPTION_SELECTORS.join(",")
              )
            );
          }
          return Array.from(gen());
        }}
        callback={() => {
          if (this.state.selection.sides.size > 0) {
            this.changeSelection(Immutable.Set());
            this.handleSpinnerBlur();
          }
        }}
      >
        <div className="spacing-control__container" ref={this.container}>
          <Popover
            visible={this.state.showPopover}
            placement={popoverPlacement}
            content={
              <div
                className="spacing-control__handles-container"
                onMouseEnter={() => (this.shouldIgnoreSpinnerBlur = true)}
                onMouseLeave={() => (this.shouldIgnoreSpinnerBlur = false)}
                ref={this.popoverContainer}
              >
                <svg className="spacing-control__svg" viewBox="0 0 130 64">
                  {(() => {
                    // Options for building this}{ from worst to best}{ and their
                    // issues:  - CSS shapes made using border tricks (a la
                    // https://css-tricks.com/examples/ShapesOfCSS/) obstruct each
                    // other with the transparent parts of those divs}{ so you
                    // can't craft the diagonal hover regions using these shapes. -
                    // clip-path polygon only operates by %}{ which is cumbersome
                    // to adjust to the required dimensions. - SVG requires manual
                    // positioning calculations}{ doesn't benefit from CSS
                    // reloading}{ and can't nest HTML (so we overlay
                    // no-pointer-event divs instead)}{ but is the most flexible.
                    const xthick = 36,
                      ythick = 24;
                    const xmax = 130,
                      ymax = 64,
                      top = 0,
                      left = 0;
                    const sides = {
                      top: `0,0 ${xthick},${ythick} ${
                        xmax - xthick
                      },${ythick} ${xmax},0`,
                      right: `${xmax},0 ${xmax - xthick},${ythick} ${
                        xmax - xthick
                      },${ymax - ythick} ${xmax},${ymax}`,
                      bottom: `${xmax},${ymax} ${xmax - xthick},${
                        ymax - ythick
                      } ${xthick},${ymax - ythick} 0,${ymax}`,
                      left: `0,${ymax} ${xthick},${
                        ymax - ythick
                      } ${xthick},${ythick} 0,0`,
                    };

                    return standardSides.map((side) => {
                      const points = closeLoop(sides[side]);

                      // Initially I tried to make the drag go with the
                      // actual movement you see reflected back.  Consider
                      // dragging bottom on a normal block div: increasing
                      // padding moves elements down, so dragging down
                      // should be +1.  But with right, increasing padding
                      // moves content leftward, not rightward, breaking
                      // the consistency with bottom.  This is because
                      // widths on normal block divs are fixed (auto or
                      // 100%), so things can't move rightward.  Quickly we
                      // realize that whether things move up/down or
                      // leftward/rightward depends on a ton of context:  -
                      // Is this fixed width? - Is this left aligned vs
                      // right aligned?  (Note this can vary by instance
                      // since it depends on parent container's text-align,
                      // flex settings, or this element's float, flex
                      // settings!) - etc.  This is unwieldy, so for now we
                      // just hardcode the positive drag directions.
                      const [xFactor, yFactor] = ((): [number, number] => {
                        switch (side) {
                          case "top":
                            return tuple(0, 1);
                          case "bottom":
                            return tuple(0, -1);
                          case "left":
                            return tuple(1, 0);
                          case "right":
                            return tuple(-1, 0);
                          default:
                            return unexpected();
                        }
                      })();
                      let numericSize = this.exp().get(
                        `${spacingStyleProp}-${side}`
                      );
                      if (numericSize === "auto") {
                        numericSize = getCssInitial(
                          `${spacingStyleProp}-${side}`,
                          "div"
                        );
                      }
                      const maybeTokenValue = lazyDerefTokenRefsWithDeps(
                        numericSize,
                        this.studioCtx().site,
                        "Spacing",
                        vsh
                      );
                      const isDraggingDisabled =
                        !isDraggableSize(maybeTokenValue);
                      return (
                        <Tooltip
                          visible={false}
                          title={getLabelForStyleName(
                            `${spacingStyleProp}-${side}`
                          )}
                          key={`${spacingStyleProp} ${side}`}
                        >
                          <g>
                            <Stated<NumericSize | undefined>
                              defaultValue={undefined}
                            >
                              {(initDim, setInitDim) => (
                                <XDraggable
                                  disabled={isDraggingDisabled}
                                  onStart={() => {
                                    this.studioCtx().startUnlogged();
                                    this.changeSelectionSingle(side, {
                                      mode: "add",
                                    });
                                    this.setState(() => ({
                                      justDragged: false,
                                    }));
                                    setInitDim(
                                      parseNumericSize(maybeTokenValue)
                                    );
                                  }}
                                  onDrag={(e) => {
                                    this.change(() => {
                                      const { num, unit } = ensure(
                                        initDim,
                                        "onDrag listener expects a initDim"
                                      );
                                      if (!this.state.justDragged) {
                                        this.setState({
                                          justDragged: true,
                                        });
                                      }
                                      this.setAllSelected(
                                        showSizeCss(
                                          createNumericSize(
                                            num +
                                              xFactor * e.data.deltaX +
                                              yFactor * e.data.deltaY,
                                            unit
                                          )
                                        )
                                      );
                                    });
                                  }}
                                  onStop={() => {
                                    defer(() => {
                                      this.toFocus = true;
                                      this.setState({ justDragged: false });
                                    });
                                    this.studioCtx().stopUnlogged();
                                    setInitDim(undefined);
                                  }}
                                >
                                  <polyline
                                    className={cn({
                                      [`spacing-control__handle`]: true,
                                      "spacing-control__handle--selected":
                                        this.state.selection.sides.has(side),
                                      "ew-resize":
                                        ["left", "right"].includes(side) &&
                                        !isDraggingDisabled,
                                      "ns-resize":
                                        ["top", "bottom"].includes(side) &&
                                        !isDraggingDisabled,
                                    })}
                                    ref={
                                      side === "top"
                                        ? this.topPart
                                        : side === "left"
                                        ? this.leftPart
                                        : undefined
                                    }
                                    transform={`translate(${left},${top})`}
                                    points={points}
                                    onClick={(e) => this.handleClick(e, side)}
                                    onContextMenu={(ev) =>
                                      this.showStyleContextMenu(
                                        ev,
                                        `${spacingStyleProp}-${side}`
                                      )
                                    }
                                  />
                                </XDraggable>
                              )}
                            </Stated>
                          </g>
                        </Tooltip>
                      );
                    });
                  })()}
                </svg>
                <div className={`spacing-control__nums`}>
                  {standardSides.map((side) => (
                    <div
                      key={side}
                      className={`spacing-control__${side}`}
                      style={
                        ["top", "bottom"].includes(side)
                          ? this.state.yThickness
                            ? { height: this.state.yThickness }
                            : undefined
                          : this.state.xThickness
                          ? { width: this.state.xThickness }
                          : undefined
                      }
                    >
                      <div className={"spacing-control__num"}>
                        {this.measureDisp({
                          prop: `${spacingStyleProp}-${side}`,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <LabeledStyleDimItem
              styleName={this.selectedStyleProps()}
              displayStyleName={this.props.spacingStyleProp}
              label={spacingLabel}
              subtitle={subtitle}
              tokenType={"Spacing"}
              vsh={vsh}
              dimOpts={{
                ref: this.spinner,
                value: this.showSelectedValues(),
                onChange: (val) => {
                  this.clearSidesIfSelectionChanges = true;
                  if (val === undefined) {
                    this.clearAllSelected();
                  } else {
                    this.setAllSelected(val);
                  }
                  defer(() => this.spinner.current?.focus());
                },
                onFocus: this.handleSpinnerFocus,
                onBlur: this.handleSpinnerBlur,
                shorthand: this.state.selection.sides.isEmpty(),
                extraOptions: this.props.allowAuto ? ["auto"] : [],
                dragScale: "10",
                min: spacingStyleProp === "padding" ? 0 : undefined,
                allowedUnits: LENGTH_PERCENTAGE_UNITS,
                allowFunctions: true,
              }}
            />
          </Popover>
        </div>
      </OnClickAwayExcept>
    );
  }
}

export const SpacingControl = observer(SpacingControl_);
