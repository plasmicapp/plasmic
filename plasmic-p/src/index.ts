import _classNames from "classnames";
import React from "react";

export type ElementTag = keyof JSX.IntrinsicElements;
export type RenderRoot = ElementTag | React.ComponentType<any>;
export type Variants = Record<string, string | string[] | undefined | {[val: string]: boolean}>;

export interface Binding<C extends RenderRoot> {
  rootClass?: C;
  props?: React.ComponentProps<C>;
  wrapped?: (element: React.ReactNode) => React.ReactNode;
  component?: (props: React.ComponentProps<C>) => React.ReactNode;
}
const BINDING_KEYS = ["rootClass", "props", "wrapped", "component"];

export type Bindings = Record<string, any>;
export type Slots = Record<string, React.ReactNode>;
export type Args = Record<string, any>;

export interface RenderOpts<V extends Variants, B extends Bindings, S extends Slots, A extends Args> {
  bindings?: B;
  variants?: V;
  slots?: S;
  args?: A;
}

export interface RepeatedRenderOpts<B extends Bindings> {
  bindings?: B;
};

const REPEATED_BINDING_KEYS = ["bindings"];

// Flex provides a more "flexible" way to specify bindings.  Specifically, you can either:
// 1. Specify the full Binding
// 2. Specify a valid ReactNode, which is interpreted as the children
// 3. Specify dict of props
// Note: We use React.ReactChild instead of React.ReactNode because we don't want to include
// React.ReactFragment, which includes {}, which would allow any object to be passed in,
// defeating any attempt to type-check!
export type Flex<B extends Binding<any>> = B | React.ReactChild | null | undefined | (B extends Binding<infer C> ? React.ComponentProps<C> : never);
export type FlexRepeated<R extends RepeatedRenderOpts<any>> = R | (R extends RepeatedRenderOpts<infer SubB> ? SubB : never);

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

export function createBindableElement<C extends RenderRoot, OC extends RenderRoot=C>(
  binding: Flex<Binding<OC>>,
  defaultRoot: C,
  defaultProps: Partial<React.ComponentProps<C>>
): React.ReactElement | null {
  const binding2 = deriveBinding(binding);

  const root = binding2.rootClass || defaultRoot;
  const props = mergeProps(defaultProps, binding2.props);

  if (binding2.component) {
    return binding2.component(props as React.ComponentProps<OC>) as (React.ReactElement | null);
  } else {
    const element = React.createElement(root, props);
    if (binding2.wrapped) {
      return binding2.wrapped(element) as (React.ReactElement | null);
    } else {
      return element;
    }
  }
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

function deriveBinding<B extends Binding<any>>(x: Flex<B>, bindingKeys: string[]=BINDING_KEYS): B {
  if (!x) {
    // undefined Binding is an empty Binding
    return {} as B;
  } else if (isReactNode(x)) {
    // If ReactNode, then assume this is the children
    return {props: {children: x}} as B;
  } else if (typeof(x) === "object") {
    // If any of the bindingKeys is a key of this object, then assume
    // this is a full Binding
    for (const key of bindingKeys) {
      if (key in x) {
        return x as unknown as B;
      }
    }

    // Else, assume this is just a props object.
    return { props: x } as unknown as B;
  }

  throw new Error(`Unexpected binding: ${x}`);
}

function isReactNode(x: any) {
  return typeof(x) === "string" || typeof(x) === "number" || React.isValidElement(x);
}

function deriveRepeatedRenderOpts<Opts extends RepeatedRenderOpts<any>>(x: FlexRepeated<Opts>): Opts {
  for (const key of REPEATED_BINDING_KEYS) {
    if (key in x) {
      return x as Opts;
    }
  }
  return {
    bindings: x
  } as Opts;
}

export function createRepeatedBindableTree<Opts extends RepeatedRenderOpts<any>>(
  repeatedOpts: readonly (FlexRepeated<Opts>)[] | undefined,
  renderFunc: (opts: Opts) => React.ReactNode
) {
  if (!repeatedOpts) {
    return null;
  }

  const realOpts = repeatedOpts.filter(opts => !!opts).map(opts => deriveRepeatedRenderOpts(opts));
  if (realOpts.length === 0) {
    return null;
  }
  if (realOpts.length === 1) {
    return renderFunc(realOpts[0]);
  }
  return React.createElement(React.Fragment, {}, realOpts.map(opts => renderFunc(opts)));
}


export interface RenderFunc<V extends Variants, B extends Bindings, S extends Slots, A extends Args> {
  (opts: RenderOpts<V, B, S, A>): React.ReactElement | null;
}

export function createPlasmicWrapper<RF extends any>(render: RF) {
  const wrap = <P extends { render: RF }>(Component: React.ComponentType<P>) => {
    const Wrapper = (props: Omit<P, "render">) => {
      const allProps = {...props, render} as any as P;
      return React.createElement(Component, allProps);
    };
    return Wrapper;
  }
  return {
    render,
    wrap
  };
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