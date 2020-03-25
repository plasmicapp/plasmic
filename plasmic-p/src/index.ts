import _classNames from "classnames";
import React from "react";

export type ElementTag = keyof JSX.IntrinsicElements;
export type RenderRoot = ElementTag | React.ComponentType<any>;
export type Variants = Record<string, string | string[] | undefined | {[val: string]: boolean}>;

export interface DefaultOverride<C extends RenderRoot> {
  type: "default",
  props: React.ComponentProps<C>;
}

export interface AsOverride<C extends RenderRoot> {
  type: "as",
  as: C;
  props: React.ComponentProps<C>;
}

export interface RenderOverride<C extends RenderRoot> {
  type: "render",
  render: (props: React.ComponentProps<C>) => React.ReactNode;
}

export type Override<DefaultRoot extends RenderRoot> = DefaultOverride<DefaultRoot>|AsOverride<any>|RenderOverride<DefaultRoot>;


const OVERRIDE_KEYS = ["as", "props", "component"];

export type Overrides = Record<string, Flex<any>>;
export type Args = Record<string, any>;

export interface RenderOpts<V extends Variants, A extends Args, O extends Overrides> {
  variants?: V;
  args?: A;
  overrides?: O;
}

// Flex provides a more "flexible" way to specify bindings.
export type Flex<DefaultRoot extends RenderRoot> =
  // Fully-specified bindings
  | Omit<DefaultOverride<DefaultRoot>, "type">
  | Omit<AsOverride<any>, "type">
  | Omit<RenderOverride<any>, "type">

  // Valid ReactNode, used as children.
  // Note: We use React.ReactChild instead of React.ReactNode because we don't want to include
  // React.ReactFragment, which includes {}, which would allow any object to be passed in,
  // defeating any attempt to type-check!
  | React.ReactChild

  // Not rendered
  | null  // rendered as null
  | undefined // rendered as null

  // dict of props for the default RenderRoot
  | React.ComponentProps<DefaultRoot>

  // render function taking in dict of props for the default RenderRoot
  | ((props: React.ComponentProps<DefaultRoot>) => React.ReactNode);

export function hasVariant<V extends Variants>(variants: V|undefined, groupName: keyof V, variant: string) {
  if (variants === undefined) {
    return false;
  }
  const groupVariants = variants[groupName];
  if (groupVariants === undefined) {
    return false;
  } else if (Array.isArray(groupVariants)) {
    return groupVariants.includes(variant);
  } else if (typeof(groupVariants) === "string") {
    return groupVariants === variant;
  } else {
    return groupVariants[variant] !== undefined && groupVariants[variant] !== false;
  }
}

export function createPlasmicElement<DefaultRoot extends RenderRoot>(
  override: Flex<DefaultRoot>,
  defaultRoot: DefaultRoot,
  defaultProps: Partial<React.ComponentProps<DefaultRoot>>
): React.ReactNode | null {
  const override2 = deriveOverride(override);
  if (override2.type === "render") {
    return override2.render(defaultProps as React.ComponentProps<DefaultRoot>);
  }

  const root = override2.type === "as" ? override2.as : defaultRoot;
  const props = mergeProps(defaultProps, override2.props);
  return React.createElement(root, props);
}

function mergeProps(defaults: Record<string, any>, overrides?: Record<string, any>): Record<string, any> {
  if (!overrides) {
    return defaults;
  }

  const result = {...defaults};

  for (const key of Object.keys(overrides)) {
    result[key] = mergePropVals(key, defaults[key], overrides[key]);
  }

  return result;
}

function mergePropVals(name: string, val1: any, val2: any): any {
  if (typeof(val1) === "function" && typeof(val2) === "function") {
    return (...args: any[]) => {
      val1(...args);
      return val2(...args);
    };
  } else if (name === "className" && val1 && val2) {
    return `${val1} ${val2}`;
  } else if (name === "style" && val1 && val2) {
    return {
      ...val1,
      ...val2
    };
  } else {
    return val2;
  }
}

function deriveOverride<C extends RenderRoot>(x: Flex<C>, bindingKeys: string[]=OVERRIDE_KEYS): Override<C> {
  if (!x) {
    // undefined Binding is an empty Binding
    return {
      type: "default",
      props: {} as any
    };
  } else if (isReactNode(x)) {
    // If ReactNode, then assume this is the children
    return {
      type: "default",
      props: {
        children: x
      } as any
    };
  } else if (typeof(x) === "object") {
    // If any of the overrideKeys is a key of this object, then assume
    // this is a full Override
    if ("as" in x) {
      return {
        ...x,
        type: "as",
      };
    } else if ("props" in x) {
      return {
        ...x,
        type: "default",
      };
    } else if ("render" in x) {
      return {
        ...x,
        type: "render",
      };
    }

    // Else, assume this is just a props object.
    return {
      type: "default",
      props: x
    };
  } else if (typeof(x) === "function") {
    return {
      type: "render",
      render: x
    };
  }

  throw new Error(`Unexpected override: ${x}`);
}

function isReactNode(x: any) {
  return typeof(x) === "string" || typeof(x) === "number" || React.isValidElement(x);
}


export const classNames = _classNames;

export function wrapFlexChild(children: React.ReactNode): React.ReactNode {
  if (Array.isArray(children)) {
    return children.map(child => wrapFlexChild(child));
  } else if (React.isValidElement(children)) {
    if (children.type === React.Fragment) {
      return wrapFlexChild(children.props.children);
    }
    const className = `__wab_flex-item ${children.props.className}`;
    return React.createElement(
      "div",
      { className },
      children
    );
  } else {
    return children;
  }
}

export interface RenderFunc<V extends Variants, A extends Args, O extends Overrides> {
  (opts: RenderOpts<V, A, O>): React.ReactNode;
}
export type RenderFuncOverrides<RF> = RF extends RenderFunc<infer V, infer A, infer O> ? O : never;
