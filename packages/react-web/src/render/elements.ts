import get from "dlv";
import * as React from "react";
import { chainSingleArgFuncs, isSubset, notNil, omit, pick } from "../common";
import {
  createElementWithChildren,
  ensureNotArray,
  isReactNode,
  mergeProps,
  mergePropVals,
  NONE,
} from "../react-utils";
import { $State } from "../states";
import { Stack } from "./Stack";

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
  props?: Partial<React.ComponentProps<C>>;
} & OverrideTwiddle;

export type AsOverride<C extends React.ElementType> = {
  type: "as";
  as: C;
  props?: Partial<React.ComponentProps<C>>;
} & OverrideTwiddle;

export type RenderOverride<C extends React.ElementType> = {
  type: "render";
  render: (props: React.ComponentProps<C>, Comp: C) => React.ReactNode;
  props?: Partial<React.ComponentProps<C>>;
} & OverrideTwiddle;

export type Override<DefaultElementType extends React.ElementType> =
  | DefaultOverride<DefaultElementType>
  | AsOverride<any>
  | RenderOverride<DefaultElementType>;

export type Overrides = Record<string, Flex<any>>;
export type Args = Record<string, any>;

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

function createPlasmicElement<DefaultElementType extends React.ElementType>(
  override: Flex<DefaultElementType>,
  defaultRoot: DefaultElementType,
  defaultProps: Partial<React.ComponentProps<DefaultElementType>>
): React.ReactNode | null {
  if (
    !override ||
    (typeof override === "object" && Object.keys(override).length === 0)
  ) {
    return createElementWithChildren(
      defaultRoot,
      defaultProps,
      defaultProps.children
    );
  }
  const override2 = deriveOverride(override);
  const props = mergeOverrideProps(defaultProps, override2.props);
  if (override2.type === "render") {
    return override2.render(
      props as React.ComponentProps<DefaultElementType>,
      defaultRoot
    );
  }

  let root = defaultRoot;
  if (override2.type === "as" && override2.as) {
    if (defaultRoot === (Stack as React.ElementType)) {
      // If there was an "as" override specified, but the default type is
      // a Stack, then we don't want to switch to using "as" as the root,
      // because then we'd lose the flex wrapper that Stack provides.
      // Instead, we specify the "as" as the "as" prop to Stack.
      props.as = override2.as;
    } else {
      root = override2.as;
    }
  }

  let children = props.children;

  if (override2.wrapChildren) {
    children = override2.wrapChildren(ensureNotArray(children));
  }

  let result = createElementWithChildren(root, props, children);

  if (override2.wrap) {
    result = override2.wrap(result) as React.ReactElement;
  }

  return result;
}

// We use data-plasmic-XXX attributes for custom properties since Typescript doesn't
// support type check on jsx pragma. See https://github.com/microsoft/TypeScript/issues/21699
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

  if (props == null) {
    props = {};
  }

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
  const triggerProps = (props["data-plasmic-trigger-props"] ??
    []) as React.HTMLAttributes<HTMLElement>[];
  delete props["data-plasmic-override"];
  delete props["data-plasmic-trigger-props"];
  return createPlasmicElement(
    override,
    defaultElement,
    mergeProps(
      props,
      children.length === 0
        ? {}
        : { children: children.length === 1 ? children[0] : children },
      ...triggerProps
    ) as any
  );
}

export function makeFragment(...children: React.ReactNode[]) {
  return React.createElement(React.Fragment, {}, ...children);
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
      // We use the NONE sentinel if the overrideVal is nil, and is not one of the
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
    } else if ("render" in x) {
      return {
        ...x,
        type: "render",
      } as any;
    } else if ("props" in x) {
      return {
        ...x,
        props: x.props || {},
        type: "default",
      };
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
      props: x as any,
    };
  } else if (typeof x === "function") {
    return {
      type: "render",
      render: x,
    };
  }

  throw new Error(`Unexpected override: ${x}`);
}

function mergeVariants<V extends Variants>(
  v1: Partial<V> | undefined,
  v2: Partial<V> | undefined
): Partial<V> {
  if (!v1 || !v2) {
    return v1 || v2 || {};
  }
  return { ...v1, ...v2 };
}

export function mergeVariantsWithStates(
  variants: Variants,
  $state: $State,
  linkedStates: {
    variantGroup: string;
    statePath: (string | number)[];
  }[]
): Variants {
  return {
    ...variants,
    ...Object.fromEntries(
      linkedStates.map(({ variantGroup, statePath }) => [
        variantGroup,
        get($state, statePath),
      ])
    ),
  };
}

function mergeArgs<A extends Args>(
  a1: Partial<A> | undefined,
  a2: Partial<A> | undefined
): Partial<A> {
  if (!a1 || !a2) {
    return a1 || a2 || {};
  }
  return { ...a1, ...a2 };
}

function mergeFlexOverrides<O extends Overrides>(
  o1: Partial<O>,
  o2: Partial<O> | undefined
): Partial<O> {
  if (!o2) {
    return o1;
  }
  const keys = Array.from(new Set([...Object.keys(o1), ...Object.keys(o2)]));
  const merged: Record<string, any> = {};
  for (const key of keys) {
    merged[key] = mergeFlexOverride(o1[key], o2[key]);
  }
  return merged as Partial<O>;
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
  const reservedPropNames = ["variants", "args", "overrides"];
  const variants = mergeVariants(
    omit(pick(props, ...internalVariantPropNames), ...reservedPropNames),
    props.variants
  );
  const args = mergeArgs(
    omit(pick(props, ...internalArgPropNames), ...reservedPropNames),
    props.args
  );
  let overrides = mergeFlexOverrides(
    omit(
      pick(props, ...descendantNames),
      ...internalArgPropNames,
      ...internalVariantPropNames,
      ...reservedPropNames
    ),
    props.overrides
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
    overrides = mergeFlexOverrides(overrides, {
      [name]: {
        props: leftoverProps,
      },
    });
  }
  return { variants, args, overrides };
}
