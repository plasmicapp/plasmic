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
  if (
    typeof content !== "number" &&
    (!content || (Array.isArray(content) && content.length === 0))
  ) {
    return null;
  }

  // If the content is a raw string, then we need to wrap the raw string
  // into an element, in case the slot is inside a flex-gap
  // container (you cannot apply margin to just a text node).
  const maybeString = maybeAsString(content);
  if (maybeString) {
    content = (
      <span className="__wab_slot-string-wrapper ρsw">{maybeString}</span>
    );
  }

  const nonEmptyProps = Object.keys(rest).filter((p) => !!(rest as any)[p]);
  if (nonEmptyProps.length === 0) {
    // No attrs to apply to the slot (which means the slot is unstyled), then
    // just render the content directly; no need for style wrapper.
    return content as React.ReactElement | null;
  }

  return React.createElement(
    as || "span",
    mergeProps({ className: "__wab_slot ρs" }, rest),
    content
  );
}

function maybeAsString(
  node: React.ReactNode
): string | React.ReactElement | undefined {
  // Unwrap fragments
  if (React.isValidElement(node)) {
    // Fragment doesn't render DOM elements
    if (node.type === React.Fragment) {
      return maybeAsString(node.props.children);
    } else if (node.type === Trans) {
      // Trans also doesn't render DOM elements. But we don't want to just render
      // its content string, because we want to keep the <Trans/> for the localization.
      // So we render the same node, to be wrapped into __wab_slot-string-wrapper.
      return node;
    }
  }

  if (typeof node === "string") {
    return node;
  }

  if (typeof node === "number") {
    return `${node}`;
  }

  if (Array.isArray(node) && node.length === 1 && typeof node[0] === "string") {
    return node[0];
  }

  return undefined;
}
