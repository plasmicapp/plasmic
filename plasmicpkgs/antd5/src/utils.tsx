import {
  CodeComponentMeta,
  default as registerComponent,
} from "@plasmicapp/host/registerComponent";
import {
  GlobalContextMeta,
  default as registerGlobalContext,
} from "@plasmicapp/host/registerGlobalContext";
import { default as registerToken } from "@plasmicapp/host/registerToken";
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

export function omit<T extends object>(
  obj: T,
  ...keys: (keyof T)[]
): Partial<T> {
  if (Object.keys(obj).length === 0) {
    return obj;
  }
  const res: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!keys.includes(key)) {
      res[key] = obj[key];
    }
  }
  return res;
}

export function has<T extends object>(obj: T, keys: (keyof T)[]): boolean {
  if (Object.keys(obj).length === 0) {
    return true;
  }
  for (const key of keys) {
    if (Array.isArray(obj)) {
      const index = parseInt(key as string);
      if (isNaN(index) || index < 0 || index >= obj.length) {
        return false;
      }
      obj = obj[index];
    } else if (typeof obj === "object" && obj != null) {
      if (!Object.prototype.hasOwnProperty.call(obj, key) || !(key in obj)) {
        return false;
      }
      obj = obj[key] as T;
    } else {
      return false;
    }
  }
  return true;
}

export function usePrevious<T>(value: T | undefined): T | undefined {
  const prevValue = React.useRef<T | undefined>(undefined);

  React.useEffect(() => {
    prevValue.current = value;

    return () => {
      prevValue.current = undefined;
    };
  });

  return prevValue.current;
}

export function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

export function ensureArray<T>(x: T | T[]): T[] {
  return Array.isArray(x) ? x : [x];
}

export function setFieldsToUndefined(obj: any) {
  if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      if (typeof obj[key] === "object") {
        setFieldsToUndefined(obj[key]);
      }
      obj[key] = undefined;
    }
  }
}

export function arrayEq(xs: ReadonlyArray<any>, ys: ReadonlyArray<any>) {
  return xs.length === ys.length && xs.every((x, i) => x === ys[i]);
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
  message?: string;
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
          title={this.props.message ?? "Something went wrong."}
          extra={this.state.errorInfo}
        />
      );
    }
    return this.props.children;
  }
}

// Forked from https://github.com/acstll/deep-get-set/blob/master/index.js
function isUnsafeKey(key: string | number | symbol) {
  return (
    (Array.isArray(key) && key[0] === "__proto__") ||
    key === "__proto__" ||
    key === "constructor" ||
    key === "prototype"
  );
}
export function get(obj: any, path: (string | number | symbol)[] | string) {
  const keys = Array.isArray(path) ? path : path.split(".");
  let i;
  for (i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!obj || !Object.hasOwn(obj, key) || isUnsafeKey(key)) {
      obj = undefined;
      break;
    }
    obj = obj[key];
  }
  return obj;
}

export function set(
  obj: any,
  path: (string | number | symbol)[] | string,
  value: any
) {
  const keys = Array.isArray(path) ? path : path.split(".");
  let i;
  for (i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (isUnsafeKey(key)) {
      return;
    }
    if (!Object.hasOwn(obj, key)) {
      if (!isNaN(Number(keys[i + 1]))) {
        obj[key] = [];
      } else {
        obj[key] = {};
      }
    }
    obj = obj[key];
  }
  obj[keys[i]] = value;
  return value;
}

export function pick<T extends {}>(
  obj: T,
  ...paths: (string | number | symbol)[][]
): Partial<T> {
  if (Object.keys(obj).length === 0) {
    return obj;
  }
  const res: any = {};
  for (const path of paths) {
    set(res, path, get(obj, path));
  }
  return res as Partial<T>;
}
