import _classNames from "classnames";
import React from "react";

export type ElementTag = keyof JSX.IntrinsicElements;
export type Variants = Record<
  string,
  string | string[] | undefined | { [val: string]: boolean }
>;

export interface DefaultOverride<C extends React.ElementType> {
  type: "default";
  props: Partial<React.ComponentProps<C>>;
}

export interface AsOverride<C extends React.ElementType> {
  type: "as";
  as: C;
  props: Partial<React.ComponentProps<C>>;
}

export interface RenderOverride<C extends React.ElementType> {
  type: "render";
  render: (props: React.ComponentProps<C>) => React.ReactNode;
}

export type Override<DefaultElementType extends React.ElementType> =
  | DefaultOverride<DefaultElementType>
  | AsOverride<any>
  | RenderOverride<DefaultElementType>;

export type Overrides = Record<string, Flex<any>>;
export type Args = Record<string, any>;

export interface RenderOpts<
  V extends Variants,
  A extends Args,
  O extends Overrides
> {
  variants?: V;
  args?: A;
  overrides?: O;
}

// Flex provides a more "flexible" way to specify bindings.
export type Flex<DefaultElementType extends React.ElementType> =
  // Fully-specified bindings
  | Omit<DefaultOverride<DefaultElementType>, "type">
  | Omit<AsOverride<any>, "type">
  | Omit<RenderOverride<any>, "type">

  // Valid ReactNode, used as children.
  // Note: We use React.ReactChild instead of React.ReactNode because we don't want to include
  // React.ReactFragment, which includes {}, which would allow any object to be passed in,
  // defeating any attempt to type-check!
  | React.ReactChild

  // Not rendered
  | null // rendered as null
  | undefined // rendered as null

  // dict of props for the DefaultElementType
  | Partial<React.ComponentProps<DefaultElementType>>

  // render function taking in dict of props for the DefaultElementType
  | ((props: React.ComponentProps<DefaultElementType>) => React.ReactNode);

export function hasVariant<V extends Variants>(
  variants: V | undefined,
  groupName: keyof V,
  variant: string
) {
  if (variants === undefined) {
    return false;
  }
  const groupVariants = variants[groupName];
  if (groupVariants === undefined) {
    return false;
  } else if (Array.isArray(groupVariants)) {
    return groupVariants.includes(variant);
  } else if (typeof groupVariants === "string") {
    return groupVariants === variant;
  } else {
    return (
      groupVariants[variant] !== undefined && groupVariants[variant] !== false
    );
  }
}

export function createPlasmicElement<
  DefaultElementType extends React.ElementType
>(
  override: Flex<DefaultElementType>,
  defaultRoot: DefaultElementType,
  defaultProps: Partial<React.ComponentProps<DefaultElementType>>,
  wrapChildrenInFlex?: boolean
): React.ReactNode | null {
  const override2 = deriveOverride(override);
  if (override2.type === "render") {
    return override2.render(
      defaultProps as React.ComponentProps<DefaultElementType>
    );
  }

  const root = override2.type === "as" ? override2.as : defaultRoot;
  const props = mergeProps(defaultProps, override2.props);
  if (wrapChildrenInFlex && props.children) {
    props.children = React.createElement(
      "div",
      { className: "__wab_flex-container" },
      wrapFlexChild(props.children)
    );
  }
  return React.createElement(root, props);
}

function mergeProps(
  defaults: Record<string, any>,
  overrides?: Record<string, any>
): Record<string, any> {
  if (!overrides) {
    return defaults;
  }

  const result = { ...defaults };

  for (const key of Object.keys(overrides)) {
    result[key] = mergePropVals(key, defaults[key], overrides[key]);
  }

  return result;
}

function mergePropVals(name: string, val1: any, val2: any): any {
  if (typeof val1 === "function" && typeof val2 === "function") {
    return (...args: any[]) => {
      val1(...args);
      return val2(...args);
    };
  } else if (name === "className" && val1 && val2) {
    return `${val1} ${val2}`;
  } else if (name === "style" && val1 && val2) {
    return {
      ...val1,
      ...val2,
    };
  } else {
    return val2;
  }
}

function deriveOverride<C extends React.ElementType>(x: Flex<C>): Override<C> {
  if (!x) {
    // undefined Binding is an empty Binding
    return {
      type: "default",
      props: {} as any,
    };
  } else if (isReactNode(x)) {
    // If ReactNode, then assume this is the children
    return {
      type: "default",
      props: {
        children: x,
      } as any,
    };
  } else if (typeof x === "object") {
    // If any of the overrideKeys is a key of this object, then assume
    // this is a full Override
    if ("as" in x) {
      return {
        ...x,
        props: x.props || {},
        type: "as",
      } as any;
    } else if ("props" in x) {
      return {
        ...x,
        props: x.props || {},
        type: "default",
      };
    } else if ("render" in x) {
      return {
        ...x,
        type: "render",
      } as any;
    }

    // Else, assume this is just a props object.
    return {
      type: "default",
      props: x,
    };
  } else if (typeof x === "function") {
    return {
      type: "render",
      render: x,
    };
  }

  throw new Error(`Unexpected override: ${x}`);
}

function isReactNode(x: any) {
  return (
    typeof x === "string" || typeof x === "number" || React.isValidElement(x)
  );
}

export const classNames = _classNames;

export function wrapFlexChild(
  children: React.ReactNode,
  index?: number
): React.ReactNode {
  if (Array.isArray(children)) {
    return children.map((child, i) => wrapFlexChild(child, i));
  } else if (React.isValidElement(children)) {
    if (children.type === React.Fragment) {
      return wrapFlexChild(children.props.children);
    }
    const className = `__wab_flex-item ${children.props.className}`;
    return React.createElement("div", { className, key: index }, children);
  } else {
    return children;
  }
}

export interface RenderFunc<
  V extends Variants,
  A extends Args,
  O extends Overrides
> {
  (opts: RenderOpts<V, A, O>): React.ReactNode;
}
export type RenderFuncOverrides<RF> = RF extends RenderFunc<
  infer V,
  infer A,
  infer O
>
  ? O
  : never;
