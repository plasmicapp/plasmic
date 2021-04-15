import React from "react";

export const isBrowser = typeof window !== "undefined";

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
    return React.createElement(React.Fragment, {}, ...children);
  } else {
    return children;
  }
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
