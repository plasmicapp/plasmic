import {
  getEffectiveOffsetParent,
  getOffsetRect,
  getPaddingRect,
  hasLayoutBox,
} from "@/wab/client/dom";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, isHTMLElt, maybe, precisionRound } from "@/wab/shared/common";
import { parseCssNumericNew } from "@/wab/shared/css";
import {
  DimProp,
  dimPropToSizeAxis,
  isStandardSide,
  oppSide,
  sideToSize,
  SizeAxis,
} from "@/wab/shared/geom";
import {
  AtomicSize,
  createNumericSize,
  showSizeCss,
  Unit,
} from "@/wab/shared/css-size";
import { IRuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { Menu } from "antd";
import * as React from "react";

export class DimManip {
  constructor(
    private studioCtx: StudioCtx,
    private forDom: JQuery | undefined | null,
    private exp: () => IRuleSetHelpers,
    private prop: DimProp
  ) {}

  /**
   * Always call this instead of exp.set() on any non-auto value.
   */
  setNum(val: string) {
    const { prop, exp } = this;
    // If both sides are on, then the width (or height) must give.
    if (isStandardSide(prop) && exp().get(oppSide(prop)) !== "auto") {
      exp().set(sideToSize(prop), "auto");
    }
    exp().set(prop, val);
  }

  /**
   * Set prop based on the currently measured offsets in the actual DOM,
   * trying to preserve the currently visible offsets, in either % or px.
   */
  trySetUsingMeasured(unit: Unit) {
    const { forDom, prop } = this;
    let newNum = 0;
    if (forDom && hasLayoutBox(forDom[0])) {
      newNum = offsetPxAsUnits(
        forDom[0],
        unit,
        getOffsetRect(forDom[0])[prop],
        dimPropToSizeAxis(prop)
      );
    }
    this.setNum(showSizeCss(createNumericSize(newNum, unit)));
  }

  private renderConvertMenuItem(toUnit: Unit, fromUnit: Unit) {
    const { studioCtx, exp, prop } = this;
    const convert = async () =>
      studioCtx.changeUnsafe(() => {
        this.trySetUsingMeasured(toUnit);
      });
    return (
      maybe(parseCssNumericNew(exp().get(prop)), (v) => v.units) ===
        fromUnit && (
        <Menu.Item key={`convert-${fromUnit}-${toUnit}`} onClick={convert}>
          <strong>Switch</strong> to {toUnit}
        </Menu.Item>
      )
    );
  }

  renderConvertMenuItems = () => {
    return [
      this.renderConvertMenuItem("%", "px"),
      this.renderConvertMenuItem("px", "%"),
    ];
  };
}

/**
 * Given a DOM elt, convert the desired pixel dimension (could be any dimension
 * like left or height) to the given unit, either px (just the same value) or %
 * (calculates how much offsetPx occupies of available space in offset parent).
 */
export function offsetPxAsUnits(
  domElt: HTMLElement,
  unit: Unit,
  offsetPx: number,
  sizeAxis: SizeAxis,
  precision: number = 2
) {
  const effectiveOffsetParent = getEffectiveOffsetParent(domElt);

  let newNum = offsetPx;
  if (unit === "%") {
    const parentSize =
      (isHTMLElt(effectiveOffsetParent) &&
        getPaddingRect(effectiveOffsetParent)[sizeAxis]) ||
      offsetPx;
    newNum = (100 * offsetPx) / parentSize;
  } else if (unit === "vw") {
    const parentSize = ensure(domElt.ownerDocument.defaultView).innerWidth;
    newNum = (100 * offsetPx) / parentSize;
  } else if (unit === "vh") {
    const parentSize = ensure(domElt.ownerDocument.defaultView).innerHeight;
    newNum = (100 * offsetPx) / parentSize;
  }

  newNum = roundDim(newNum, unit, precision);
  return newNum;
}

export function roundDim(
  val: number,
  unit: string,
  precision: number = 2,
  allowFractionalUnitless: boolean = false
) {
  if (
    unit === "%" ||
    unit === "em" ||
    (unit === "" && allowFractionalUnitless)
  ) {
    return precisionRound(val, Math.min(precision, 4));
  }
  return Math.round(val);
}

export type Dims = { [P in DimProp]: AtomicSize };
