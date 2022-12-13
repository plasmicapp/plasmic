import * as React from "react";
import { mergeProps } from "../react-utils";
import { Trans } from "./translation";

export function PlasmicSlot<T extends keyof JSX.IntrinsicElements = "div">(
  props: React.ComponentProps<T> & {
    as?: T;
    defaultContents?: React.ReactNode;
    value?: React.ReactNode;
  }
) {
  return renderPlasmicSlot(props);
}

export function renderPlasmicSlot<
  T extends keyof JSX.IntrinsicElements = "div"
>(opts: {
  as?: T;
  defaultContents?: React.ReactNode;
  value?: React.ReactNode;
}) {
  const { as, defaultContents, value, ...rest } = opts;

  let content = value === undefined ? defaultContents : value;
  if (!content || (Array.isArray(content) && content.length === 0)) {
    return null;
  }

  // If the content is a raw string, then we need to wrap the raw string
  // into an element, in case the slot is inside a flex-gap
  // container (you cannot apply margin to just a text node).
  const maybeString = maybeAsString(content);
  if (maybeString) {
    content = <span className="__wab_slot-string-wrapper">{maybeString}</span>;
  }

  const nonEmptyProps = Object.keys(rest).filter((p) => !!(rest as any)[p]);
  if (nonEmptyProps.length === 0) {
    // No attrs to apply to the slot (which means the slot is unstyled), then
    // just render the content directly; no need for style wrapper.
    return <>{content}</>;
  }

  return React.createElement(
    as || "span",
    mergeProps({ className: "__wab_slot" }, rest),
    content
  );
}

function maybeAsString(node: React.ReactNode): string | undefined {
  // Unwrap fragments
  if (
    React.isValidElement(node) &&
    // Fragment and Trans don't render DOM elements
    (node.type === React.Fragment || node.type === Trans)
  ) {
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
