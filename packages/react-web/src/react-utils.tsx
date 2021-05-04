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
