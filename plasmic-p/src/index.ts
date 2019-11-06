import _classNames from "classnames";
import React from "react";

export type ElementTag = keyof JSX.IntrinsicElements;
export type RenderRoot = ElementTag | React.ComponentType;
export type Variants = {[key: string]: string | string[] | undefined | {[val: string]: boolean}};

export interface Binding<C extends RenderRoot> {
  rootClass?: C;
  props?: React.ComponentProps<C>;
  wrapped?: (element: React.ReactNode) => React.ReactNode;
  component?: (props: React.ComponentProps<C>) => React.ReactNode;
}
export type Bindings = {
  [key: string]: Binding<any> | readonly RepeatedRenderOpts<any>[];
};

export interface RenderOpts<V extends Variants> {
  variants?: V;
  bindings?: Bindings;
  slots?: {[key: string]: React.ReactNode};
}

export type RepeatedRenderOpts<C extends RenderRoot> = Binding<C> & {
  bindings?: Bindings;
}

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
  binding: Binding<OC> | undefined,
  defaultRoot: C,
  defaultProps: Partial<React.ComponentProps<C>>
): React.ReactElement | null {
  binding = binding || {};

  const root = binding.rootClass || defaultRoot;
  const props = {...defaultProps, ...binding.props};

  if (binding.component) {
    return binding.component(props as React.ComponentProps<OC>) as (React.ReactElement | null);
  } else {
    const element = React.createElement(root, props);
    if (binding.wrapped) {
      return binding.wrapped(element) as (React.ReactElement | null);
    } else {
      return element;
    }
  }
}

export function createRepeatedBindableTree<Opts extends RepeatedRenderOpts<any>>(
  repeatedOpts: readonly Opts[] | undefined,
  renderFunc: (opts: Opts) => React.ReactNode
) {
  if (!repeatedOpts || repeatedOpts.length === 0) {
    return null;
  }
  if (repeatedOpts.length === 1) {
    return renderFunc(repeatedOpts[0]);
  }
  return React.createElement(React.Fragment, {}, repeatedOpts.map(opts => renderFunc(opts)));
}


export interface RenderFunc<V extends Variants> {
  (opts: RenderOpts<V>): React.ReactElement | null;
}

export function createPlasmicWrapper<V extends Variants, RF extends RenderFunc<V>>(render: RF) {
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
