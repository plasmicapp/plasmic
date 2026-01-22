import {
  CodeComponentMeta,
  default as registerComponent,
} from "@plasmicapp/host/registerComponent";
import {
  GlobalContextMeta,
  default as registerGlobalContext,
} from "@plasmicapp/host/registerGlobalContext";
import { default as registerToken } from "@plasmicapp/host/registerToken";
import { parseDate } from "@plasmicpkgs/luxon-parser";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React from "react";

export type Registerable = {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
  registerToken: typeof registerToken;
};

export function makeRegisterComponent<T extends React.ComponentType<any>>(
  component: T,
  meta: CodeComponentMeta<React.ComponentProps<T>>
) {
  return function (loader?: Registerable) {
    registerComponentHelper(loader, component, meta);
  };
}

export function makeRegisterGlobalContext<T extends React.ComponentType<any>>(
  component: T,
  meta: GlobalContextMeta<React.ComponentProps<T>>
) {
  return function (loader?: Registerable) {
    if (loader) {
      loader.registerGlobalContext(component, meta);
    } else {
      registerGlobalContext(component, meta);
    }
  };
}

export function registerComponentHelper<T extends React.ComponentType<any>>(
  loader: Registerable | undefined,
  component: T,
  meta: CodeComponentMeta<React.ComponentProps<T>>
) {
  if (loader) {
    loader.registerComponent(component, meta);
  } else {
    registerComponent(component, meta);
  }
}

type ReactElt = {
  children: ReactElt | ReactElt[];
  props: {
    children: ReactElt | ReactElt[];
    [prop: string]: any;
  } | null;
  type: React.ComponentType<any> | null;
  key: string | null;
} | null;

export function traverseReactEltTree(
  children: React.ReactNode,
  callback: (elt: ReactElt) => void
) {
  const rec = (elts: ReactElt | ReactElt[] | null) => {
    (Array.isArray(elts) ? elts : [elts]).forEach((elt) => {
      if (elt) {
        callback(elt);
        if (elt.children) {
          rec(elt.children);
        }
        if (elt.props?.children && elt.props.children !== elt.children) {
          rec(elt.props.children);
        }
      }
    });
  };
  rec(children as any);
}

export function asArray<T>(x: T[] | T | undefined | null) {
  if (Array.isArray(x)) {
    return x;
  } else if (x == null) {
    return [];
  } else {
    return [x];
  }
}

export function ensureNumber(x: number | string): number {
  return x as number;
}

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    throw new Error("Expected non-null or non-undefined value");
  }
  return x;
}

export function isOneOf<T, U extends T>(elem: T, arr: readonly U[]): elem is U {
  return arr.includes(elem as any);
}

export function maybe<T, U>(
  x: T | undefined | null,
  f: (y: T) => U
): U | undefined {
  if (x === undefined || x === null) {
    return undefined;
  }
  return f(x);
}

/**
 *
 * @param str iso string
 * @param extendedOnly boolean for extended mode (i.e. time)
 * @returns Returns true for strings in ISO 8601 format
 */
export function isValidIsoDate(str: string | undefined, extendedOnly = false) {
  if (!str) {
    return false;
  }
  if (typeof str !== "string") {
    return false;
  }
  if (str.includes(" ")) {
    return false;
  } // spaces not supported
  if (str.length === 10) {
    if (extendedOnly) {
      return false;
    }
    dayjs.extend(customParseFormat);
    return dayjs(str, "YYYY-MM-DD", true).isValid();
  }
  if (!dayjs(str).isValid()) {
    return false;
  } // should be a valid dayjs date
  if (isNaN(new Date(str).getTime())) {
    return false;
  } // should be a valid js date
  return true;
}

export function isLikeDate(value: unknown) {
  const parsed = parseDate(value);
  return parsed ? true : false;
}

export function isLikeImage(value: unknown) {
  return typeof value === "string"
    ? value.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|tiff)$/i)
    : false;
}

export function isLikeColor(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const hex =
    /^#?([0-9a-fA-F]{3}([0-9a-fA-F]{3})?|[0-9a-fA-F]{4}([0-9a-fA-F]{4})?)$/;
  const rgba =
    /^rgba?\((\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*(1|0?(\.\d+)?))?\s*)\)$/;
  const cssNamed =
    /^(aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)$/;
  const hsla =
    /^hsla?\((\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*(,\s*(1|0?\.\d+))?\s*)\)$/;
  const cmyk =
    /^cmyka?\((\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*(,\s*(1|0?\.\d+))?\s*)\)$/;
  const hsv =
    /^hsva?\((\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*(,\s*(1|0?\.\d+))?\s*)\)$/;

  if (
    value.match(hex) ||
    value.match(rgba) ||
    value.match(cssNamed) ||
    value.match(hsla) ||
    value.match(cmyk) ||
    value.match(hsv)
  ) {
    return true;
  }

  return false;
}

// Some heuristics to avoid selecting a row when
// the object clicked is interactable -- like button, anchor,
// input, etc.  This won't be bulletproof, so just some
// heuristics!
export function isInteractable(target: HTMLElement) {
  if (["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
    return true;
  }
  if (target.contentEditable === "true") {
    return true;
  }

  return false;
}

export function ensureArray<T>(xs: T | T[]): T[] {
  return Array.isArray(xs) ? xs : [xs];
}

export const tuple = <T extends any[]>(...args: T): T => args;

export interface HasId {
  id: string;
}

export function mkIdMap<T extends HasId>(xs: ReadonlyArray<T>): Map<string, T> {
  return new Map(xs.map((x) => tuple(x.id, x) as [string, T]));
}

export const mkShortId = () => `${Math.random()}`;

export function withoutNils<T>(xs: Array<T | undefined | null>): T[] {
  return xs.filter((x): x is T => x != null);
}

export type Falsey = null | undefined | false | "" | 0 | 0n;
export type Truthy<T> = T extends Falsey ? never : T;

export function withoutFalsey<T>(xs: Array<T | Falsey>): T[] {
  return xs.filter((x): x is T => !!x);
}

/**
 *
 * Forked from: https://github.com/ant-design/pro-components/blob/master/packages/utils/src/components/ErrorBoundary/index.tsx
 *
 */
import { Result } from "antd";
import type { ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children?: React.ReactNode;
  canvasEnvId?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state = { hasError: false, errorInfo: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    // eslint-disable-next-line no-console
    console.log(error, errorInfo);
  }

  componentDidUpdate(
    prevProps: Readonly<ErrorBoundaryProps>,
    prevState: Readonly<ErrorBoundaryState>
  ) {
    if (
      prevProps.canvasEnvId !== this.props.canvasEnvId &&
      prevState.hasError
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Result
          status="error"
          title="Something went wrong."
          extra={this.state.errorInfo}
        />
      );
    }
    return this.props.children;
  }
}
