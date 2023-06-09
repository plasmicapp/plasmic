import React from "react";
export const AnchorLink = React.forwardRef(function AnchorLink(
  props: React.ComponentProps<"a">,
  ref: React.Ref<HTMLAnchorElement>
) {
  return <a {...props} ref={ref} />;
});
