import * as React from "react";
import { createElementWithChildren } from "../react-utils";
import { wrapFlexContainerChildren } from "./elements";

function renderStack<T extends keyof JSX.IntrinsicElements>(
  as: T,
  props: React.ComponentProps<T>,
  hasGap: boolean | undefined,
  ref: React.Ref<any>
) {
  const { children, ...rest } = props;
  const wrappedChildren = wrapFlexContainerChildren(children, hasGap ?? false);
  return createElementWithChildren(as, { ref, ...rest }, wrappedChildren);
}

function FlexStack_<T extends keyof JSX.IntrinsicElements = "div">(
  props: { as?: T; hasGap?: boolean } & React.ComponentProps<T>,
  outerRef: React.Ref<any>
) {
  const { as, hasGap, ...rest } = props;
  return renderStack(
    as ?? "div",
    rest as React.ComponentProps<T>,
    hasGap,
    outerRef
  );
}

const FlexStack = React.forwardRef(FlexStack_) as <
  T extends keyof JSX.IntrinsicElements = "div"
>(
  props: { as?: T; hasGap?: boolean } & React.ComponentProps<T>
) => React.ReactElement;

const makeStackImpl = <T extends keyof JSX.IntrinsicElements>(as: T) => {
  return React.forwardRef(
    (
      props: React.ComponentProps<T> & { hasGap?: boolean },
      ref: React.Ref<any>
    ) => {
      const { hasGap, ...rest } = props;
      return renderStack(as, rest as React.ComponentProps<T>, hasGap, ref);
    }
  ) as React.FC<React.ComponentProps<T> & { hasGap?: boolean }>;
};

export const Stack = Object.assign(FlexStack, {
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
});
