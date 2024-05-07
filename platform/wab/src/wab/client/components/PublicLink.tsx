/** @format */

import { isAbsoluteUrl } from "@/wab/commons/urls";
import * as React from "react";
import { Link as ReactRouterLink } from "react-router-dom";

type PublicLinkProps = React.ComponentProps<"a">;

export function PublicLink(props: PublicLinkProps) {
  if (isAbsoluteUrl(props.href || "")) {
    // Use normal link for absolute URLs
    return <a {...props} />;
  } else {
    // Use RR Link for internal navigation
    return (
      <ReactRouterLink {...(props as any)} href={undefined} to={props.href} />
    );
  }
}
