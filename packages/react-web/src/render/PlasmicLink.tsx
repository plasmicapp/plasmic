import React from "react";
import { omit, pick } from "../common";

export function PlasmicLink(props: any) {
  // props.href is required for nextjs; if no props.href,
  // then we just render the default anchor element
  if (props.platform === "nextjs" && props.href) {
    const nextjsProps = [
      "href",
      "replace",
      "scroll",
      "shallow",
      "passHref",
      "prefetch",
      "locale",
    ];

    return React.createElement(
      props.component,
      pick(props, ...nextjsProps),
      <a {...omit(props, "component", "platform", ...nextjsProps)} />
    );
  }

  if (props.platform === "gatsby" && isInternalHref(props.href)) {
    return React.createElement(props.component, {
      ...omit(props, "component", "platform", "href"),
      ...{ to: props.href },
    });
  }

  return <a {...omit(props, "component", "platform")} />;
}

function isInternalHref(href: string): boolean {
  return /^\/(?!\/)/.test(href);
}
