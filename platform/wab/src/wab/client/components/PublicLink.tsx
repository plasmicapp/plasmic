import { Link as RouterLink } from "@/wab/client/route/Link";
import { isAbsoluteUrl } from "@/wab/commons/urls";
import * as React from "react";

type PublicLinkProps = React.ComponentProps<"a">;

export function PublicLink(props: PublicLinkProps) {
  if (isAbsoluteUrl(props.href || "")) {
    // Use normal link for absolute URLs
    return <a {...props} />;
  } else {
    // Use our routing-aware Link for internal navigation
    return <RouterLink {...props} to={props.href || ""} />;
  }
}
