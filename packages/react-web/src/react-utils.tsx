import classNames from "classnames";
import React from "react";

export const isBrowser = typeof window !== "undefined";
export const NONE = Symbol("NONE");

export const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

export function createElementWithChildren(
  elementType: any,
  props: any,
  children: React.ReactNode
) {
  if (Array.isArray(children)) {
    return React.createElement(
      elementType,
      props,
      ...children
    ) as React.ReactElement;
  } else if (children || "children" in props) {
    // Only call React.createElement with `children` if there are actual children,
    // or if there was an explicit (albeit undefined) children passed via
    // props.  Otherwise, if you pass `undefined` as the children argument
    // to React.createElement, the created element will have prop {children: undefined}.
    // If the `root` is an PlasmicGeneratedComponent, and these props with {children: undefined}
    // are used, then it will be taken as a `children` override, and will thus blank out
    // everything under the root node.
    return React.createElement(elementType, props, children);
  } else {
    return React.createElement(elementType, props);
  }
}

export function ensureNotArray(children: React.ReactNode) {
  if (Array.isArray(children)) {
    if (children.length === 1) {
      return children[0];
    } else {
      return React.createElement(React.Fragment, {}, ...children);
    }
  } else {
    return children;
  }
}

/**
 * Flattens ReactNode into an array of ReactChild, but does NOT replace
 * missing keys with array index, as React.Children.toArray() does.
 */
export function toChildArray(children: React.ReactNode): React.ReactChild[] {
  if (isReactChild(children)) {
    return [children];
  } else if (Array.isArray(children)) {
    return children.flatMap(toChildArray);
  } else {
    return [];
  }
}

export function isReactText(child: React.ReactNode): child is React.ReactText {
  return typeof child === "string" || typeof child === "number";
}

export function isReactChild(
  child: React.ReactNode
): child is React.ReactChild {
  return React.isValidElement(child) || isReactText(child);
}

export function isReactFragment(
  child: React.ReactNode
): child is React.ReactElement {
  return React.isValidElement(child) && child.type === React.Fragment;
}

export function isReactNode(x: any) {
  return (
    typeof x === "string" || typeof x === "number" || React.isValidElement(x)
  );
}

// From https://stackoverflow.com/questions/54775790/forcing-excess-property-checking-on-variable-passed-to-typescript-function
export type StrictProps<T, TExpected> = Exclude<
  keyof T,
  keyof TExpected
> extends never
  ? {}
  : "Unexpected extraneous props";

export type HTMLElementRefOf<T extends keyof JSX.IntrinsicElements> = Exclude<
  React.ComponentProps<T>["ref"],
  string
>;

export function mergeProps(
  props: Record<string, any>,
  ...restProps: Record<string, any>[]
): Record<string, any> {
  const result = { ...props };

  for (const rest of restProps) {
    for (const key of Object.keys(rest)) {
      result[key] = mergePropVals(key, result[key], rest[key]);
    }
  }

  return result;
}

function updateRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
  } else {
    if (!Object.isFrozen(ref)) {
      (ref as React.MutableRefObject<T | null>).current = value;
    }
  }
}

export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (value: T) => {
    for (const ref of refs) {
      updateRef(ref, value);
    }
  };
}

export function mergePropVals(name: string, val1: any, val2: any): any {
  if (val1 === NONE || val2 === NONE) {
    // The NONE sentinel always skips all merging and returns null
    return null;
  } else if (val1 == null) {
    // If either of them is nil, prefer the other
    return val2;
  } else if (val2 == null) {
    return val1;
  } else if (name === "className") {
    // Special case for className -- always combine both class names
    return classNames(val1, val2);
  } else if (name === "style") {
    // Special case for style -- always shallow-merge style dicts
    return { ...val1, ...val2 };
  } else if (name === "ref") {
    // Special case for ref
    return mergeRefs(val1, val2);
  } else if (typeof val1 !== typeof val2) {
    // If the type of the two values are different, then no way to merge them.
    // Prefer val2.
    return val2;
  } else if (name.startsWith("on") && typeof val1 === "function") {
    // Special case for event handlers -- always call both handlers
    return (...args: any[]) => {
      let res: any;
      if (typeof val1 === "function") {
        res = val1(...args);
      }
      if (typeof val2 === "function") {
        res = val2(...args);
      }
      return res;
    };
  } else {
    // For all else, prefer val2
    return val2;
  }
}

export function getElementTypeName(element: React.ReactElement) {
  if (typeof element.type === "string") {
    return element.type;
  } else {
    const comp = element.type as any;
    return comp.displayName ?? comp.name ?? comp.render?.name ?? "Component";
  }
}
