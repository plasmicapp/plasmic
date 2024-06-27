import { check, ensure, precisionRound, unexpected } from "@/wab/shared/common";
import { cssUnitsChecked, VALID_UNITS } from "@/wab/shared/css";

export type Unit = (typeof cssUnitsChecked)[number] | "fr" | "";

export function ensureUnit(text: string): Unit {
  if (isValidUnit(text)) {
    return text;
  }
  throw new Error(`"${text}" is not a valid unit`);
}

export function isValidUnit(text: string): text is Unit {
  return VALID_UNITS.has(text);
}

export interface KeywordSize {
  readonly type: "KeywordSize";
  readonly value: "auto";
}

export interface NumericSize {
  readonly type: "NumericSize";
  readonly num: number;
  readonly unit: Unit;
}

export type AtomicSize = KeywordSize | NumericSize;

export interface MinMaxSize {
  readonly type: "MinMaxSize";
  readonly min: AtomicSize;
  readonly max: AtomicSize;
}

export type Size = AtomicSize | MinMaxSize;

export function showSizeCss(size: Size): string {
  switch (size.type) {
    case "KeywordSize":
      return size.value;
    case "MinMaxSize":
      return `minmax(${showSizeCss(size.min)}, ${showSizeCss(size.max)})`;
    case "NumericSize":
      return `${size.num}${size.unit}`;
  }
}

export const autoSize: KeywordSize = { type: "KeywordSize", value: "auto" };

export function createNumericSize(num: number, unit: Unit): NumericSize {
  check(isFinite(num));
  return { type: "NumericSize", num, unit };
}

function rawParseNumericSize(text: string) {
  return ensure(tryRawParseNumericSize(text), `Failed to parse ${text}`);
}

function tryRawParseNumericSize(text: string) {
  const match = /^\s*(-?[\d.]+)([\w%]*)\s*$/.exec(text);
  if (!match) {
    return undefined;
  }
  const [num, unit] = match.slice(1);
  return {
    num,
    unit,
  };
}

export class ScreenSizeSpec {
  constructor(readonly minWidth?: number, readonly maxWidth?: number) {}

  match(width: number) {
    if (this.minWidth !== undefined && this.maxWidth === undefined) {
      return width >= this.minWidth;
    } else if (this.minWidth === undefined && this.maxWidth !== undefined) {
      return width <= this.maxWidth;
    } else if (this.minWidth !== undefined && this.maxWidth !== undefined) {
      return width >= this.minWidth && width <= this.maxWidth;
    } else {
      // both min/max undefined
      return true;
    }
  }

  query() {
    const conds: string[] = [];
    if (this.minWidth !== undefined) {
      conds.push(`(min-width:${this.minWidth}px)`);
    }
    if (this.maxWidth !== undefined) {
      conds.push(`(max-width:${this.maxWidth}px)`);
    }
    return conds.join(" and ");
  }

  summary() {
    if (this.minWidth !== undefined && this.maxWidth === undefined) {
      return `[${this.minWidth},]`;
    } else if (this.minWidth === undefined && this.maxWidth !== undefined) {
      return `[,${this.maxWidth}]`;
    } else if (this.minWidth !== undefined && this.maxWidth !== undefined) {
      return `[${this.minWidth}, ${this.maxWidth}]`;
    } else {
      // both min/max undefined
      return `[]`;
    }
  }

  title() {
    if (this.minWidth !== undefined && this.maxWidth === undefined) {
      return `Screen width of at least ${this.minWidth}px`;
    } else if (this.minWidth === undefined && this.maxWidth !== undefined) {
      return `Screen width of at most ${this.maxWidth}px`;
    } else if (this.minWidth !== undefined && this.maxWidth !== undefined) {
      return `Screen width between ${this.minWidth}px and ${this.maxWidth}px`;
    } else {
      return `Screen width unrestricted`;
    }
  }
}

export function parseScreenSpec(q: string) {
  const parts = q.split("and");
  let minWidth: number | undefined = undefined;
  let maxWidth: number | undefined = undefined;
  for (const cond of parts) {
    if (cond.includes("min-width")) {
      minWidth = Math.max(
        0,
        +ensure(
          /^\(\s*min-width\s*:\s*(-?\d+\.?\d*)px\s*\)$/.exec(cond.trim()),
          "Couldn't parse: " + cond
        )[1]
      );
    } else if (cond.includes("max-width")) {
      maxWidth = Math.max(
        0,
        +ensure(
          /^\(\s*max-width\s*:\s*(-?\d+\.?\d*)px\s*\)$/.exec(cond.trim()),
          "Couldn't parse: " + cond
        )[1]
      );
    }
  }
  return new ScreenSizeSpec(minWidth, maxWidth);
}

export function parseNumericSize(text: string): NumericSize {
  const { num, unit } = rawParseNumericSize(text);
  return createNumericSize(parseFloat(num), ensureUnit(unit || "px"));
}

export function tryParseNumericSize(text: string): NumericSize | undefined {
  const res = tryRawParseNumericSize(text);
  if (!res) {
    return undefined;
  }
  const { num, unit } = res;
  const effectiveUnit = unit || "px";
  if (isValidUnit(effectiveUnit)) {
    return createNumericSize(parseFloat(num), effectiveUnit);
  } else {
    return undefined;
  }
}

export function parseAtomicSize(text: string): AtomicSize {
  if (text === "auto") {
    return { type: "KeywordSize", value: text };
  } else {
    return parseNumericSize(text);
  }
}

export function tryParseAtomicSize(text: string): AtomicSize | undefined {
  if (text === "auto") {
    return { type: "KeywordSize", value: text };
  } else {
    return tryParseNumericSize(text);
  }
}

export function ensureNumericSize(size: Size): NumericSize {
  return size.type === "NumericSize" ? size : unexpected();
}

/**
 * Takes a percent (e.g. 87 for 87%, not 0.87) and rounds it to a reasonable
 * number of decimal places.
 */
export function roundCssPct(pct: number) {
  return precisionRound(pct, 4);
}
