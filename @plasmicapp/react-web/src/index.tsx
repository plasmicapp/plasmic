import _classNames from "classnames";
import React from "react";

export type ElementTag = keyof JSX.IntrinsicElements;

interface Variants {
  [vg: string]: any;
}

export type MultiChoiceArg<M extends string> = M | M[] | { [v in M]?: boolean };
export type SingleChoiceArg<M extends string> = M;
export type SingleBooleanChoiceArg<M extends string> = M | boolean;

interface OverrideTwiddle {
  wrapChildren?: (children: React.ReactNode) => React.ReactNode;
  wrap?: (node: React.ReactNode) => React.ReactNode;
}

export type DefaultOverride<C extends React.ElementType> = {
  type: "default";
  props: Partial<React.ComponentProps<C>>;
} & OverrideTwiddle;

export type AsOverride<C extends React.ElementType> = {
  type: "as";
  as: C;
  props: Partial<React.ComponentProps<C>>;
} & OverrideTwiddle;

export type RenderOverride<C extends React.ElementType> = {
  type: "render";
  render: (props: React.ComponentProps<C>) => React.ReactNode;
} & OverrideTwiddle;

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
  variants?: Partial<V>;
  args?: Partial<A>;
  overrides?: Partial<O>;
}

// Flex provides a more "flexible" way to specify bindings.
export type Flex<DefaultElementType extends React.ElementType> =
  // Fully-specified bindings
  | Omit<DefaultOverride<DefaultElementType>, "type">
  | Omit<AsOverride<any>, "type">
  | Omit<RenderOverride<DefaultElementType>, "type">

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
  if (variants == null) {
    return false;
  }
  const groupVariants = variants[groupName];
  if (groupVariants == null) {
    return false;
  } else if (groupVariants === true) {
    return variant === groupName;
  } else if (groupVariants === false) {
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

  const root =
    override2.type === "as" ? override2.as || defaultRoot : defaultRoot;
  const props = mergeProps(
    defaultProps,
    override2.type === "default" || override2.type === "as"
      ? override2.props
      : {}
  );
  let children = props.children;

  if (override2.wrapChildren) {
    children = override2.wrapChildren(children);
  }

  if (wrapChildrenInFlex && props.children) {
    if (Array.isArray(children)) {
      children = React.createElement(
        "div",
        { className: "__wab_flex-container" },
        ...children
      );
    } else {
      children = React.createElement(
        "div",
        { className: "__wab_flex-container" },
        children
      );
    }
  }

  let result: React.ReactElement | null = null;
  if (Array.isArray(children)) {
    result = React.createElement(
      root,
      props,
      ...children
    ) as React.ReactElement;
  } else {
    result = React.createElement(root, props, children) as React.ReactElement;
  }

  if (override2.wrap) {
    result = override2.wrap(result) as React.ReactElement;
  }

  return result;
}

// We use data-plasmic-XXX attributes for custom properties since Typescript doesn't
// support type check on @jsx pragma. See https://github.com/microsoft/TypeScript/issues/21699
// for more info.
export function createPlasmicElementProxy<
  DefaultElementType extends React.ElementType
>(
  defaultElement: DefaultElementType,
  props: Partial<React.ComponentProps<DefaultElementType>>,
  ...children: React.ReactNode[]
) {
  const override = props["data-plasmic-override"];
  const wrapFlexChild = props["data-plasmic-wrap-flex-child"];
  delete props["data-plasmic-override"];
  delete props["data-plasmic-wrap-flex-child"];
  return createPlasmicElement(
    override,
    defaultElement,
    {
      ...props,
      ...(children.length === 0 ? {} : { children })
    },
    wrapFlexChild
  );
}

export function makeFragment(...children: React.ReactNode[]) {
  return React.createElement(React.Fragment, {}, ...children);
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

function mergePropVals(name: string, defaultVal: any, overrideVal: any): any {
  if (typeof defaultVal === "function" && typeof overrideVal === "function") {
    return (...args: any[]) => {
      defaultVal(...args);
      return overrideVal(...args);
    };
  } else if (name === "className") {
    return `${defaultVal || ""} ${overrideVal || ""}`;
  } else if (name === "style") {
    return {
      ...(defaultVal || {}),
      ...(overrideVal || {})
    };
  } else {
    // Else we always let override win, even if override is undefined, so that
    // it is possible for users to override an unwanted default value.
    return overrideVal;
  }
}

export function wrapWithClassName(element: React.ReactNode, className: string) {
  const key = React.isValidElement(element)
    ? element.key || undefined
    : undefined;
  return React.createElement(
    "div",
    {
      key,
      className,
      style: {
        display: "grid"
      }
    },
    element
  );
}

export function PlasmicIcon(
  props: React.ComponentProps<"svg"> & {
    PlasmicIconType: React.ComponentType;
  }
) {
  const { PlasmicIconType, ...rest } = props;
  return <PlasmicIconType {...rest} />;
}

function maybeAsString(node: React.ReactNode): string | undefined {
  // Unwrap fragments
  if (React.isValidElement(node) && node.type === React.Fragment) {
    return maybeAsString(node.props.children);
  }

  if (typeof node === "string") {
    return node;
  }

  if (Array.isArray(node) && node.length === 1 && typeof node[0] === "string") {
    return node[0];
  }

  return undefined;
}

export function PlasmicSlot<T extends keyof JSX.IntrinsicElements = "div">(
  props: React.ComponentProps<T> & {
    as?: T;
    defaultContents?: React.ReactNode;
    value?: React.ReactNode;
  }
) {
  const { as, defaultContents, value, ...rest } = props;

  let content = value === undefined ? defaultContents : value;
  if (!content || (Array.isArray(content) && content.length === 0)) {
    return null;
  }

  // If the content is a raw string, then we need to wrap the raw string
  // into an element, in case the slot is inside a flex-gap
  // container (you cannot apply margin to just a text node).
  const maybeString = maybeAsString(content);
  if (maybeString) {
    content = <div className="__wab_slot-string-wrapper">{maybeString}</div>;
  }

  const nonEmptyProps = Object.keys(rest).filter(p => !!(rest as any)[p]);
  if (nonEmptyProps.length === 0) {
    // No attrs to apply to the slot (which means the slot is unstyled), then
    // just render the content directly; no need for style wrapper.
    return <>{content}</>;
  }

  return React.createElement(
    as || "div",
    mergeProps({ className: "__wab_slot" }, rest),
    content
  );
}

// To get a type safe FlexStack, you need to explicitly specify both the tag
// and generic type, such as
//   <StackImpl as={"a"} href={...}>...</FlexStack>
export const StackImpl = <
  T extends keyof JSX.IntrinsicElements | React.ComponentType<any>
>(
  props: React.ComponentProps<T> & { as: T }
) => {
  const { as, children, ...rest } = props;
  const wrappedChildren = (
    <div className="__wab_flex-container">{children}</div>
  );
  return React.createElement(as, rest, wrappedChildren);
};

const makeStackImpl = <
  T extends keyof JSX.IntrinsicElements | React.ComponentType<any>
>(
  as: T
) => {
  return (props: React.ComponentProps<T>) => {
    return <StackImpl as={as} {...props} />;
  };
};

export const Stack = {
  div: makeStackImpl("div"),
  a: makeStackImpl("a"),
  button: makeStackImpl("button"),
  h1: makeStackImpl("h1"),
  h2: makeStackImpl("h2"),
  h3: makeStackImpl("h3"),
  h4: makeStackImpl("h4"),
  h5: makeStackImpl("h5"),
  h6: makeStackImpl("h6"),
  label: makeStackImpl("label"),
  form: makeStackImpl("form"),
  section: makeStackImpl("section"),
  head: makeStackImpl("head"),
  main: makeStackImpl("main"),
  nav: makeStackImpl("nav")
};

export const DefaultFlexStack = Stack.div;

export const FlexStack = Stack;

function deriveOverride<C extends React.ElementType>(x: Flex<C>): Override<C> {
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
  } else if (typeof x === "object") {
    // If any of the overrideKeys is a key of this object, then assume
    // this is a full Override
    if ("as" in x) {
      return {
        ...x,
        props: x.props || {},
        type: "as"
      } as any;
    } else if ("props" in x) {
      return {
        ...x,
        props: x.props || {},
        type: "default"
      };
    } else if ("render" in x) {
      return {
        ...x,
        type: "render"
      } as any;
    } else if (isSubset(Object.keys(x), ["wrap", "wrapChildren"])) {
      // Only twiddling functions present, so assume no props overrides
      // (otherwise we'd assume these were props).
      return {
        ...x,
        props: {},
        type: "default"
      };
    }

    // Else, assume this is just a props object.
    return {
      type: "default",
      props: x
    };
  } else if (typeof x === "function") {
    return {
      type: "render",
      render: x
    };
  }

  throw new Error(`Unexpected override: ${x}`);
}

function isSubset<T>(a1: T[], a2: T[]) {
  return a1.every(x => a2.includes(x));
}

function isReactNode(x: any) {
  return (
    typeof x === "string" || typeof x === "number" || React.isValidElement(x)
  );
}

export const classNames = _classNames;

export interface RenderFunc<
  V extends Variants,
  A extends Args,
  O extends Overrides
> {
  (opts: RenderOpts<V, A, O>): React.ReactNode;
}
export type RenderFuncOverrides<RF> = RF extends RenderFunc<any, any, infer O>
  ? O
  : never;
export type RenderFuncVariants<RF> = RF extends RenderFunc<infer V, any, any>
  ? V
  : never;
export type RenderFuncArgs<RF> = RF extends RenderFunc<any, infer A, any>
  ? A
  : never;

export abstract class Renderer<
  V extends Variants,
  A extends Args,
  RFs extends Record<string, RenderFunc<V, A, any>>,
  Root extends keyof RFs
> {
  constructor(
    protected variants: Partial<V>,
    protected args: Partial<A>,
    protected renderFuncs: RFs,
    protected root: Root
  ) {}
  protected abstract create(
    variants: Partial<V>,
    args: Partial<A>
  ): Renderer<V, A, RFs, Root>;
  abstract getInternalVariantProps(): string[];
  abstract getInternalArgProps(): string[];
  withVariants(variants: Partial<V>): this {
    return this.create(
      mergeVariants(this.variants, variants),
      this.args
    ) as this;
  }
  withArgs(args: Partial<A>): this {
    return this.create(this.variants, mergeArgs(this.args, args)) as this;
  }
  withOverrides(overrides: RenderFuncOverrides<RFs[Root]>) {
    return this.forNode(this.root).withOverrides(overrides);
  }
  forNode(node: keyof RFs): NodeRenderer<RFs[typeof node]> {
    return new NodeRenderer(
      this.renderFuncs[node],
      this.variants as RenderFuncVariants<RFs[typeof node]>,
      this.args as RenderFuncArgs<RFs[typeof node]>,
      {}
    );
  }
  render() {
    return this.forNode(this.root).render();
  }
}

export class NodeRenderer<RF extends RenderFunc<any, any, any>> {
  constructor(
    protected renderFunc: RF,
    protected variants: Partial<RenderFuncVariants<RF>>,
    protected args: Partial<RenderFuncArgs<RF>>,
    protected overrides: Partial<RenderFuncOverrides<RF>>
  ) {}
  withVariants(variants: Partial<RenderFuncVariants<RF>>): this {
    return new NodeRenderer(
      this.renderFunc,
      mergeVariants(this.variants, variants),
      this.args,
      this.overrides
    ) as this;
  }
  withArgs(args: Partial<RenderFuncArgs<RF>>): this {
    return new NodeRenderer(
      this.renderFunc,
      this.variants,
      mergeArgs(this.args, args),
      this.overrides
    ) as this;
  }
  withOverrides(overrides: Partial<RenderFuncOverrides<RF>>): this {
    return new NodeRenderer(
      this.renderFunc,
      this.variants,
      this.args,
      mergeFlexOverrides(this.overrides, overrides)
    ) as this;
  }
  render() {
    return this.renderFunc({
      variants: this.variants,
      overrides: this.overrides,
      args: this.args
    }) as React.ReactElement | null;
  }
}

function mergeVariants<V extends Variants>(
  v1: Partial<V>,
  v2: Partial<V>
): Partial<V> {
  return { ...v1, ...v2 };
}

function mergeArgs<A extends Args>(a1: Partial<A>, a2: Partial<A>): Partial<A> {
  return { ...a1, ...a2 };
}

function mergeFlexOverrides<O extends Overrides>(
  o1: Partial<O>,
  o2: Partial<O>
): Partial<O> {
  const keys = Array.from(new Set([...Object.keys(o1), ...Object.keys(o2)]));
  const merged: Record<string, any> = {};
  for (const key of keys) {
    merged[key] = mergeFlexOverride(o1[key], o2[key]);
  }
  return merged as Partial<O>;
}

function chainSingleArgFuncs<A>(...funcs: ((arg: A) => A)[]) {
  if (funcs.length === 0) {
    return undefined;
  }
  return (arg: A) => {
    let res: A = arg;
    for (const func of funcs) {
      res = func(res);
    }
    return res;
  };
}

function mergeFlexOverride<C extends React.ElementType<any>>(
  fo1: Flex<C> | undefined,
  fo2: Flex<C> | undefined
): Flex<C> | undefined {
  if (!fo1) {
    return fo2;
  }
  if (!fo2) {
    return fo1;
  }

  const o1 = deriveOverride(fo1);
  const o2 = deriveOverride(fo2);
  const wrap = chainSingleArgFuncs(...[o1.wrap, o2.wrap].filter(notNil));
  const wrapChildren = chainSingleArgFuncs(
    ...[o1.wrapChildren, o2.wrapChildren].filter(notNil)
  );

  // "render" type always takes precedence
  if (o2.type === "render") {
    return {
      render: o2.render,
      wrap,
      wrapChildren
    };
  }

  if (o1.type === "render") {
    return {
      render: o1.render,
      wrap,
      wrapChildren
    };
  }

  const props = mergeProps(o1.props, o2.props) as Partial<
    React.ComponentProps<C>
  >;

  // "as" will take precedence
  const as =
    (o2.type === "as" ? o2.as : undefined) ??
    (o1.type === "as" ? o1.as : undefined);

  return {
    props,
    wrap,
    wrapChildren,
    ...(as ? { as } : {})
  };
}

export type RendererVariants<
  R extends Renderer<any, any, any, any>
> = R extends Renderer<infer V, any, any, any> ? V : never;

function notNil<T>(x: T | undefined | null): x is T {
  return x != null;
}
