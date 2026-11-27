import { Link as RouterLink } from "@/wab/client/route/Link";
import { isAbsoluteUrl } from "@/wab/commons/urls";
import * as React from "react";

type PublicLinkProps = React.ComponentPropsWithoutRef<"a">;

export const PublicLink = React.forwardRef<HTMLAnchorElement, PublicLinkProps>(
  function PublicLink(props, ref) {
    if (isAbsoluteUrl(props.href || "")) {
      // Use normal link for absolute URLs
      return <a {...props} ref={ref} />;
    } else {
      // Use our routing-aware Link for internal navigation
      return <RouterLink {...props} ref={ref} to={props.href || ""} />;
    }
  },
);
