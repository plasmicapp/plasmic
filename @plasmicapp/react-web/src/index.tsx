import _classNames from "classnames";
import * as React from "react";
import { useFocusRing as useAriaFocusRing } from "@react-aria/focus";

// From https://stackoverflow.com/questions/54775790/forcing-excess-property-checking-on-variable-passed-to-typescript-function
export type StrictProps<T, TExpected> = Exclude<
  keyof T,
  keyof TExpected
> extends never
  ? {}
  : "Unexpected extraneous props";

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
  props?: Partial<React.ComponentProps<C>>;
} & OverrideTwiddle;

export type RenderOverride<C extends React.ElementType> = {
  type: "render";
  render: (props: React.ComponentProps<C>) => React.ReactNode;
  props?: Partial<React.ComponentProps<C>>;
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
  variants: Partial<V>;
  args: Partial<A>;
  overrides: Partial<O>;
  forNode?: string;
}

// Flex provides a more "flexible" way to specify bindings.
export type Flex<DefaultElementType extends React.ElementType> =
  // Fully-specified bindings
  | (Omit<DefaultOverride<DefaultElementType>, "type"> & {
      as?: never;
      render?: never;
    })
  | Omit<AsOverride<any>, "type">
  | (Omit<RenderOverride<DefaultElementType>, "type"> & {
      as?: never;
    })

  // Valid ReactNode, used as children.
  // Note: We use React.ReactChild instead of React.ReactNode because we don't want to include
  // React.ReactFragment, which includes {}, which would allow any object to be passed in,
  // defeating any attempt to type-check!
  | React.ReactChild

  // Ignored
  | null
  | undefined

  // dict of props for the DefaultElementType
  | (Partial<React.ComponentProps<DefaultElementType>> & {
      wrap?: never;
      wrapChildren?: never;
      props?: never;
      as?: never;
      render?: never;
    })

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
  const props = mergeOverrideProps(defaultProps, override2.props);
  if (override2.type === "render") {
    return override2.render(props as React.ComponentProps<DefaultElementType>);
  }

  const root =
    override2.type === "as" ? override2.as || defaultRoot : defaultRoot;

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
  } else if (children || "children" in props) {
    // Only call React.createElement with `children` if there are actual children,
    // or if there was an explicit (albeit undefined) children passed via
    // props.  Otherwise, if you pass `undefined` as the children argument
    // to React.createElement, the created element will have prop {children: undefined}.
    // If the `root` is an PlasmicGeneratedComponent, and these props with {children: undefined}
    // are used, then it will be taken as a `children` override, and will thus blank out
    // everything under the root node.
    result = React.createElement(root, props, children);
  } else {
    result = React.createElement(root, props);
  }

  if (override2.wrap) {
    result = override2.wrap(result) as React.ReactElement;
  }

  return result;
}

// We use data-plasmic-XXX attributes for custom properties since Typescript doesn't
// support type check on @jsx pragma. See https://github.com/microsoft/TypeScript/issues/21699
// for more info.
const seenElements = new Map<string, React.ReactNode>();
export function createPlasmicElementProxy<
  DefaultElementType extends React.ElementType
>(
  defaultElement: DefaultElementType,
  props: Partial<React.ComponentProps<DefaultElementType>>,
  ...children: React.ReactNode[]
) {
  // We use seenElements to keep track of elements that has been rendered by
  // createPlasmicElementProxy().  When a JSX tree is evaluated, the JSX factory
  // is invoked from the leaf to the root as the last call.  So we can store
  // all the elements we've created until we encounter the leaf, at which point
  // we will clear this map.  We are guaranteed that this map will only contain
  // elements from one Plasmic* component at a time, because we're just creating
  // elements and not "rendering" at this point; even if this JSX tree references
  // other Plasmic* elements, we'll just create an element referencing that component,
  // rather than following into the content of that component.
  //
  // TODO: is this ConcurrentMode friendly?

  const name = props["data-plasmic-name"];
  const isRoot = props["data-plasmic-root"];
  const forNodeName = props["data-plasmic-for-node"];

  delete props["data-plasmic-name"];
  delete props["data-plasmic-root"];
  delete props["data-plasmic-for-node"];

  const element = createPlasmicElementFromJsx(
    defaultElement,
    props,
    ...children
  );
  if (name) {
    seenElements.set(name, element);
  }

  if (isRoot) {
    // If this is the root, and we requested a specific node by specifying data-plasmic-for-node,
    // then return that node instead
    const forNode = forNodeName
      ? seenElements.get(forNodeName) ?? null
      : element;

    // Clear out the seenElements map, as we're done rendering this Plasmic* component.
    seenElements.clear();
    return forNode;
  }
  return element;
}

function createPlasmicElementFromJsx<
  DefaultElementType extends React.ElementType
>(
  defaultElement: DefaultElementType,
  props: Partial<React.ComponentProps<DefaultElementType>>,
  ...children: React.ReactNode[]
) {
  const override = props["data-plasmic-override"];
  const wrapFlexChild = props["data-plasmic-wrap-flex-child"];
  const triggerProps = (props["data-plasmic-trigger-props"] ??
    []) as React.HTMLAttributes<HTMLElement>[];
  delete props["data-plasmic-override"];
  delete props["data-plasmic-wrap-flex-child"];
  return createPlasmicElement(
    override,
    defaultElement,
    mergeProps(
      props,
      children.length === 0 ? {} : { children },
      ...triggerProps
    ) as any,
    wrapFlexChild
  );
}

export function makeFragment(...children: React.ReactNode[]) {
  return React.createElement(React.Fragment, {}, ...children);
}

const NONE = Symbol("NONE");

function mergeProps(
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

function mergePropVals(name: string, val1: any, val2: any): any {
  if (val1 === NONE || val2 === NONE) {
    // The NONE sentinel always skips all merging and returns null
    return null;
  } else if (val1 == null) {
    // If either of them is nil, prefer the other
    return val2;
  } else if (val2 == null) {
    return val1;
  } else if (typeof val1 !== typeof val2) {
    // If the type of the two values are different, then no way to merge them.
    // Prefer val2.
    return val2;
  } else if (name === "className") {
    // Special case for className -- always combine both class names
    return classNames(val1, val2);
  } else if (name === "style") {
    // Special case for style -- always shallow-merge style dicts
    return { ...val1, ...val2 };
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

export const UNSET = Symbol("UNSET");

function mergeOverrideProps(
  defaults: Record<string, any>,
  overrides?: Record<string, any>
): Record<string, any> {
  if (!overrides) {
    return defaults;
  }

  const result = { ...defaults };

  for (const key of Object.keys(overrides)) {
    const defaultVal = defaults[key];
    let overrideVal = overrides[key];
    if (overrideVal === UNSET) {
      delete result[key];
    } else {
      // We use the NONE sentinel of the overrideVal is nil, and is not one of the
      // props that we merge by default -- which are className, style, and
      // event handlers.  This means for all other "normal" props -- like children,
      // title, etc -- a nil value will unset the default.
      if (
        overrideVal == null &&
        key !== "className" &&
        key !== "style" &&
        !(key.startsWith("on") && typeof defaultVal === "function")
      ) {
        overrideVal = NONE;
      }
      result[key] = mergePropVals(key, defaultVal, overrideVal);
    }
  }

  return result;
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
        display: "grid",
      },
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

  const nonEmptyProps = Object.keys(rest).filter((p) => !!(rest as any)[p]);
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
  nav: makeStackImpl("nav"),
};

export const DefaultFlexStack = Stack.div;

export const FlexStack = Stack;

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
    } else if (isSubset(Object.keys(x), ["wrap", "wrapChildren"])) {
      // Only twiddling functions present, so assume no props overrides
      // (otherwise we'd assume these were props).
      return {
        ...x,
        props: {},
        type: "default",
      };
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

function isSubset<T>(a1: T[], a2: T[]) {
  return a1.every((x) => a2.includes(x));
}

function isReactNode(x: any) {
  return (
    typeof x === "string" || typeof x === "number" || React.isValidElement(x)
  );
}

export const classNames = _classNames;

interface RenderFunc<V extends Variants, A extends Args, O extends Overrides> {
  (opts: RenderOpts<V, A, O>): React.ReactElement | null;
}

export abstract class Renderer<
  V extends Variants,
  A extends Args,
  O extends Overrides,
  Root extends keyof O
> {
  constructor(
    protected variants: Partial<V>,
    protected args: Partial<A>,
    protected renderFunc: RenderFunc<V, A, O>,
    protected root: Root
  ) {}
  protected abstract create(
    variants: Partial<V>,
    args: Partial<A>
  ): Renderer<V, A, O, Root>;
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
  withOverrides(overrides: O) {
    return this.forNode(this.root).withOverrides(overrides);
  }
  forNode(node: keyof O) {
    return new NodeRenderer(
      this.renderFunc,
      node as string,
      this.variants as V,
      this.args as A,
      {}
    );
  }
  render() {
    return this.forNode(this.root).render();
  }
}

export class NodeRenderer<
  V extends Variants,
  A extends Args,
  O extends Overrides
> {
  constructor(
    protected renderFunc: RenderFunc<V, A, O>,
    protected name: string,
    protected variants: Partial<V>,
    protected args: Partial<A>,
    protected overrides: Partial<O>
  ) {}
  withVariants(variants: Partial<V>): this {
    return new NodeRenderer(
      this.renderFunc,
      this.name,
      mergeVariants(this.variants, variants),
      this.args,
      this.overrides
    ) as this;
  }
  withArgs(args: Partial<A>): this {
    return new NodeRenderer(
      this.renderFunc,
      this.name,
      this.variants,
      mergeArgs(this.args, args),
      this.overrides
    ) as this;
  }
  withOverrides(overrides: Partial<O>): this {
    return new NodeRenderer(
      this.renderFunc,
      this.name,
      this.variants,
      this.args,
      mergeFlexOverrides(this.overrides, overrides)
    ) as this;
  }
  render() {
    return this.renderFunc({
      variants: this.variants,
      overrides: this.overrides,
      args: this.args,
      forNode: this.name,
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

  // "render" type always takes precedence, but we still merge the props
  const props = mergeOverrideProps(o1.props ?? {}, o2.props) as Partial<
    React.ComponentProps<C>
  >;
  if (o2.type === "render") {
    return {
      render: o2.render,
      props,
      wrap,
      wrapChildren,
    };
  }

  if (o1.type === "render") {
    return {
      render: o1.render,
      props,
      wrap,
      wrapChildren,
    };
  }

  // "as" will take precedence
  const as =
    (o2.type === "as" ? o2.as : undefined) ??
    (o1.type === "as" ? o1.as : undefined);

  return {
    props,
    wrap,
    wrapChildren,
    ...(as ? { as } : {}),
  };
}

export function deriveRenderOpts(
  props: Record<string, any>,
  config: {
    name: string;
    descendantNames: string[];
    internalVariantPropNames: string[];
    internalArgPropNames: string[];
  }
) {
  const {
    name,
    descendantNames,
    internalVariantPropNames,
    internalArgPropNames,
  } = config;
  const variants = mergeVariants(
    pick(props, ...internalVariantPropNames),
    props.variants ?? {}
  );
  const args = mergeArgs(
    pick(props, ...internalArgPropNames),
    props.args ?? {}
  );
  let overrides = mergeOverrideProps(
    pick(props, ...descendantNames),
    props.overrides ?? {}
  );

  const leftoverProps = omit(
    props,
    "variants",
    "args",
    "overrides",
    ...descendantNames,
    ...internalVariantPropNames,
    ...internalArgPropNames
  ) as Partial<React.ComponentProps<"button">>;

  if (Object.keys(leftoverProps).length > 0) {
    overrides = mergeOverrideProps(overrides, {
      [name]: {
        props: leftoverProps,
      },
    });
  }
  return { variants, args, overrides };
}

function notNil<T>(x: T | undefined | null): x is T {
  return x != null;
}

export function pick<T, S extends keyof T>(
  obj: T,
  ...keys: S[]
): Partial<Pick<T, S>> {
  const res: Partial<Pick<T, S>> = {};
  for (const key of keys) {
    if (key in obj) {
      res[key] = obj[key];
    }
  }
  return res;
}

export function omit<T>(obj: T, ...keys: (keyof T)[]): Partial<T> {
  const res: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!keys.includes(key)) {
      res[key] = obj[key];
    }
  }
  return res;
}

function useFocused(opts: { isTextInput?: boolean }) {
  const { isFocused, focusProps } = useAriaFocusRing({
    within: false,
    isTextInput: opts.isTextInput,
  });

  return [isFocused, focusProps];
}

function useFocusVisible(opts: { isTextInput?: boolean }) {
  const { isFocusVisible, focusProps } = useAriaFocusRing({
    within: false,
    isTextInput: opts.isTextInput,
  });

  return [isFocusVisible, focusProps];
}

function useFocusedWithin(opts: { isTextInput?: boolean }) {
  const { isFocused, focusProps } = useAriaFocusRing({
    within: true,
    isTextInput: opts.isTextInput,
  });

  return [isFocused, focusProps];
}

function useFocusVisibleWithin(opts: { isTextInput?: boolean }) {
  const { isFocusVisible, focusProps } = useAriaFocusRing({
    within: true,
    isTextInput: opts.isTextInput,
  });

  return [isFocusVisible, focusProps];
}

function useHover() {
  const [isHover, setHover] = React.useState(false);
  return [
    isHover,
    {
      onMouseEnter: (e: React.MouseEvent) => setHover(true),
      onMouseLeave: (e: React.MouseEvent) => setHover(false),
    },
  ];
}

function usePressed() {
  const [isPressed, setPressed] = React.useState(false);
  return [
    isPressed,
    {
      onMouseDown: (e: React.MouseEvent) => setPressed(true),
      onMouseUp: (e: React.MouseEvent) => setPressed(false),
    },
  ];
}

const TRIGGER_TO_HOOK = {
  useHover,
  useFocused,
  useFocusVisible,
  useFocusedWithin,
  useFocusVisibleWithin,
  usePressed,
} as const;

type TriggerType = keyof typeof TRIGGER_TO_HOOK;

interface TriggerOpts {
  isTextInput?: boolean;
}

/**
 * Installs argment trigger. All the useTrigger calls must use hardcoded `trigger` arg,
 * as it's not valid to install variable React hooks!
 */
export function useTrigger(trigger: TriggerType, opts: TriggerOpts) {
  return TRIGGER_TO_HOOK[trigger](opts) as [
    boolean,
    React.HTMLAttributes<HTMLElement>
  ];
}
