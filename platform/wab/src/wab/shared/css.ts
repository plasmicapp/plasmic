import {
  chunkPairs,
  ensure,
  maybes,
  simpleWords,
  tryParseNumLit,
  tuple,
} from "@/wab/shared/common";
import {
  createNumericSize,
  ensureUnit,
  showSizeCss,
} from "@/wab/shared/css-size";
import {
  horizontalSides,
  standardSides,
  verticalSides,
} from "@/wab/shared/geom";
import { RuleSet } from "@/wab/shared/model/classes";
import CssInitials from "css-initials";
import {
  camelCase,
  flatten,
  isString,
  kebabCase,
  mapKeys,
  mapValues,
  memoize,
  uniq,
} from "lodash";
import memoizeOne from "memoize-one";
import { CSSProperties } from "react";

// see visibility-utils.ts
export const PLASMIC_DISPLAY_NONE = "plasmic-display-none";

/** Transforms "fontStyle" into "font-style". Keep leading - if specified. */
export const normProp = memoize((prop: string) => {
  const kebabProp = kebabCase(prop);
  if (prop.startsWith("-")) {
    return `-${kebabProp}`;
  }
  return kebabProp;
});

/** Transforms "font-style" into "fontStyle" */
export const camelProp = memoize((prop: string) => camelCase(prop));

// Filling up CssInitials with missing values
const browserCssInitialsOverrides = {
  "justify-self": "auto", // was just missing
  "justify-items": "stretch", // was just missing
  "flex-row-gap": "0px",
  "flex-column-gap": "0px",
  "user-select": "text",
  "backdrop-filter": "initial",
  "transition-property": "all",
  "transition-timing-function": "ease",
  "transition-delay": "0s",
  "transition-duration": "0s",
};

export const FAKE_CSS_PROPS = [
  "flex-row-gap",
  "flex-column-gap",
  PLASMIC_DISPLAY_NONE,
];

// Overrides on CssInitials with Plasmic-specific defaults; these are default css values we
// want for all elements.
//
// Tags by content category are listed here, currently used for display prop: https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
export const cssInitialsOverrides = {
  display: {
    img: "inline-block",
    li: "list-item",
    span: "inline",
    "*": "block",
  },
  "white-space": "pre-wrap",
  "grid-row": "auto",
  "grid-column": "auto",
  // <span/> need to have `position: static` so that, when used in rich text, it
  // doesn't start a new stacking context, and background can be clipped to it
  position: { span: "static", "*": "relative" },
  background: "none",
  "background-size": "100% 100%",
  "background-repeat": "no-repeat",
  "flex-row-gap": "0px",
  "flex-column-gap": "0px",
  [PLASMIC_DISPLAY_NONE]: "false",

  // Overrides for browser elements that come with pre-built css.  Based on /static/css/normalize.css

  // For these form elements, need to override their text properties to `inherit` so
  // that they can take their styles from the component root
  "font-family": {
    "input textarea button code pre span p": "inherit",
  },
  "line-height": {
    "input textarea button code pre span p": "inherit",
  },
  "font-size": {
    "input textarea button h1 h2 h3 h4 h5 h6 span p": "inherit",
  },
  "font-style": {
    "address button input textarea span p": "inherit",
  },
  "font-weight": {
    "h1 h2 h3 h4 h5 h6 button input textarea span p": "inherit",
  },
  color: {
    "a input textarea button span p": "inherit",
  },
  "text-transform": {
    "input textarea button span p": "inherit",
  },
  "background-image": {
    button: "none",
    input: "linear-gradient(#ffffff, #ffffff)",
  },
  ...sidesOverrides("border-{side}-width", {
    "button input textarea": "1px",
    "*": "0px",
  }),
  ...sidesOverrides("border-{side}-style", {
    "button input textarea": "solid",
  }),
  ...sidesOverrides("border-{side}-color", {
    "button input textarea": "lightgray",
  }),
  // Overrides for browser elements that come with pre-built css
  ...sidesOverrides("margin-{side}", {
    "*": "0",
  }),
  ...sidesOverrides("padding-{vside}", {
    "ol ul": "0",
    "button input select textarea": "2px",
  }),
  ...sidesOverrides("padding-{hside}", {
    "ol ul": "0",
    "button select": "6px",
    "textarea input": "2px",
  }),
  "list-style-type": {
    "ol ul": "none",
  },
  "box-shadow": {
    "*": "none",
  },
  "box-sizing": "border-box",
  "text-decoration-line": "none",
  "align-items": { button: "flex-start" },
  "text-align": { button: "center" },
};

function sidesOverrides(prop: string, vals: Record<string, string>) {
  const token = ensure(
    ["{side}", "{vside}", "{hside}"].find((s) => prop.includes(s)),
    "prop is expected to include {site}, {vside} or {hside}"
  );
  const sides =
    token === "{side}"
      ? standardSides
      : token === "{vside}"
      ? verticalSides
      : horizontalSides;
  return Object.fromEntries(
    sides.map((side) => tuple(prop.replace(token, side), vals))
  );
}

const cssInitialsOverridesReverseMaps = new Map(
  Object.entries(cssInitialsOverrides).map(([prop, entry]) =>
    tuple(
      prop,
      isString(entry)
        ? new Map([tuple("*", entry)])
        : new Map(
            flatten(
              Object.entries(entry).map(([tags, val]) =>
                simpleWords(tags).map((tag) => tuple(tag, val))
              )
            )
          )
    )
  )
);

export function tryGetCssInitial(
  prop: string,
  tag: string | undefined
): string | undefined {
  if (tag == null) {
    tag = undefined;
  }
  const entry = cssInitialsOverridesReverseMaps.get(prop);
  if (entry != null) {
    return (
      (tag && entry.get(tag)) || entry.get("*") || tryGetBrowserCssInitial(prop)
    );
  } else {
    return tryGetBrowserCssInitial(prop);
  }
}

export const getTagsWithCssOverrides = memoizeOne(
  function getTagsWithCssOverrides() {
    return uniq([
      "*",
      ...[...cssInitialsOverridesReverseMaps.entries()].flatMap(
        ([_prop, tagMap]) => [...tagMap.keys()]
      ),
    ]);
  }
);

export function getCssOverrides(tag: string, forExprText: boolean) {
  const result = {};
  for (const [prop, tagMap] of cssInitialsOverridesReverseMaps.entries()) {
    if (FAKE_CSS_PROPS.includes(prop)) {
      continue;
    }
    if (forExprText) {
      // If getting CSS overrides for HTML ExprText elements, don't generate
      // `display`, `position` and `text-decoration-line`.
      if (
        prop === "display" ||
        prop === "position" ||
        prop === "text-decoration-line"
      ) {
        continue;
      }
      // Generate `white-space: normal` for ExprText.
      if (prop === "white-space") {
        result[prop] = "normal";
        continue;
      }
    }
    if (tagMap.has(tag)) {
      result[prop] = ensure(
        tagMap.get(tag),
        "tagMap is expected to contain tag"
      );
    }
  }
  return result;
}

export function getCssInitial(prop: string, tag: string | undefined) {
  return ensure(
    tryGetCssInitial(prop, tag),
    "tryGetCssInitial is expected to be non-null"
  );
}

export function tryGetBrowserCssInitial(prop: string): string | undefined {
  return browserCssInitialsOverrides[prop] || CssInitials[prop];
}

export function parseCssNumericNew(x: /*TWZ*/ string) {
  // Parse strings like "30", "30px", "30%", "30px /* blah blah */"
  const res = x.match(
    /^\s*(-?(?:\d+\.\d*|\d*\.\d+|\d+))\s*((?!auto)[a-z]*|%)\s*(?:\/\*.*)?$/i
  );
  if (res == null) {
    return undefined;
  }
  const [_whole, num, units] = [...res];
  return { num: +num, units };
}

export function roundedCssNumeric(x: string, precision: number) {
  const parsed = parseCssNumericNew(x);
  if (!parsed) {
    return x;
  }
  return showCssNumericNew({
    num: +parsed.num.toFixed(precision),
    units: parsed.units,
  });
}

export const showCssNumericNew = ({
  num,
  units,
}: {
  num: number;
  units: string;
}) => `${num}${units}`;

export function parseSize(val: string) {
  if (simpleWords(val).length === 1) {
    return undefined;
  }
  const [w, h] = [...simpleWords(val)];
  return tuple(w, h);
}

export function showWidthHeight(w: string, h: string) {
  return `${w} ${h}`;
}

export function getCssRulesFromRs(
  rs: RuleSet | null | undefined,
  _camelCase = false
) {
  if (!rs) {
    return {};
  }
  if (_camelCase) {
    return mapKeys(rs.values, (val, key) => camelProp(key));
  } else {
    return { ...rs.values };
  }
}

// We shouldn't quote font family keywords
const FONT_FAMILY_KEYWORDS = [
  "initial",
  "inherit",
  "serif",
  "sans-serif",
  "cursive",
  "fantasy",
  "system-ui",
  "monospace",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
];

export const showCssValues = (name: string, vals: /*TWZ*/ string[]) => {
  if (name === "font-family") {
    // Font-family need to be quoted, in case it has special character like '.
    return vals
      .map((val) => {
        if (FONT_FAMILY_KEYWORDS.includes(val)) {
          return val;
        }
        return val.startsWith("var(") ? val : `"${val}"`;
      })
      .join(", ");
  } else if (name === "transform") {
    return vals.join(" ");
  } else if (["filter", "backdrop-filter"].includes(name)) {
    const values = vals.filter((s) => !s.startsWith("hidden#"));
    return values.length === 0 ? "unset" : values.join(" ");
  } else {
    return vals.join(", ");
  }
};

const lengthCssUnitsChecked = [
  "ch",
  "cm",
  "em",
  "ex",
  "in",
  "mm",
  "pc",
  "pt",
  "px",
  "rem",
  "vh",
  "vw",
  "vmax",
  "vmin",
  "%",
] as const;

export const lengthCssUnits = lengthCssUnitsChecked as readonly string[];

export function getLengthUnits(defaultUnit: string) {
  return [...new Set([defaultUnit, ...lengthCssUnits]).values()];
}

export const cssUnitsChecked = [
  ...lengthCssUnitsChecked,
  "deg",
  "grad",
  "turn",
  "rad",
] as const;

export const cssUnits = cssUnitsChecked as readonly string[];

export const typicalCssLengthUnits = new Set(["px", "%", "em"]);

export const isValidCssValue = (prop: /*TWZ*/ string, val: /*TWZ*/ string) =>
  // TODO
  ![...cssUnits].includes(val);

export function asValidCssTime(x: string) {
  const res = parseCssNumericNew(x);
  if (!res) {
    return undefined;
  }
  let { num, units } = res;
  if (!units) {
    units = "s";
  }
  return `${num}${units}`;
}

interface EdgePos {
  top?: string;
  down?: string;
  right?: string;
  left?: string;
}

// Recognizes either "<dim> <dim>" or "<side> <dim> <side> <dim>"
export const parseBgPos = (value: string): EdgePos => {
  const words = simpleWords(value);
  switch (words.length) {
    case 2:
      return { left: words[0], top: words[1] };
  }
  return Object.fromEntries(chunkPairs(words));
};

export const showBgPos = (sides: EdgePos) => {
  return Object.entries(sides)
    .map(([side, value]) => `${side} ${value}`)
    .join(" ");
};

export function markAllImportant(props: CSSProperties): CSSProperties {
  return mapValues(props, (str) => `${str} !important`) as any;
}

export function parseCssShorthand(val: string) {
  val = val.trim();
  const vals = val.trim().split(/\s+/);
  if (vals.length === 1) {
    return [vals[0], vals[0], vals[0], vals[0]];
  } else if (vals.length === 2) {
    return [vals[0], vals[1], vals[0], vals[1]];
  } else if (vals.length === 3) {
    return [vals[0], vals[1], vals[2], vals[1]];
  } else if (vals.length === 4) {
    return vals;
  } else {
    return vals.slice(4);
  }
}

export function showCssShorthand(vals: string[]) {
  return toShorthandVals(vals).join(" ");
}

export function toShorthandVals(vals: string[]) {
  const [one, two, three, four] = vals;
  if (one === two && two === three && three === four) {
    return [one];
  } else if (one === three && two === four) {
    return [one, two];
  } else if (two === four) {
    return [one, two, three];
  } else {
    return [one, two, three, four];
  }
}

export function autoUnit(val: string, defaultUnit: string, prev?: string) {
  const newNum = tryParseNumLit(val);
  const unit =
    defaultUnit === ""
      ? ""
      : maybes(prev)((_prev) => parseCssNumericNew(_prev))(
          (parsed) => parsed.units
        )() || defaultUnit;
  return newNum !== undefined && isFinite(newNum)
    ? showSizeCss(createNumericSize(newNum, ensureUnit(unit)))
    : val;
}

export function fontWeightNumber(val: string) {
  if (val === "normal") {
    return 400;
  } else if (val === "bold") {
    return 700;
  } else {
    const parsed = parseInt(val);
    if (isNaN(parsed)) {
      return 400;
    }
    return parsed;
  }
}

export function uniqifyClassName(className: string) {
  return uniq(className.split(/\s+/).filter((s) => s.length > 0)).join(" ");
}

export const VALID_UNITS = new Set([...cssUnits, "fr", ""]);

export function camelCssPropsToKebab(props: CSSProperties) {
  return Object.fromEntries(
    Object.entries(props).map(([k, v]) => tuple(normProp(k), v))
  );
}
