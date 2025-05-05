import { usePlasmicLinkMaybe } from "@plasmicapp/host";
import React from "react";
import { omit, pick } from "../common";

export const PlasmicLink = React.forwardRef(function PlasmicLink(
  props: any,
  ref: React.Ref<any>
) {
  // The usePlasmicLinkMaybe function may be undefined, if host is not up-to-date
  const Link = usePlasmicLinkMaybe?.() ?? PlasmicLinkInternal;
  if (Link === PlasmicLink || Link === PlasmicLinkInternal) {
    // Just in case, break the cycle
    return <PlasmicLinkInternal {...props} ref={ref} />;
  } else {
    // Don't pass component/platform props to non-PlasmicLinkInternal
    return <Link {...omit(props, "component", "platform")} ref={ref} />;
  }
});

export const PlasmicLinkInternal = React.forwardRef(
  function PlasmicLinkInternal(props: any, ref: React.Ref<any>) {
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

      // If this is a fragment identifier link, then we set
      // scroll={false} so that smooth scrolling works
      const isFragment = props.href?.startsWith("#");

      return React.createElement(
        props.component,
        {
          scroll: !isFragment,
          ...pick(props, ...nextjsProps),
          legacyBehavior: true,
        },
        <a
          {...omit(props, "component", "platform", ...nextjsProps)}
          ref={ref}
        />
      );
    }

    if (props.platform === "gatsby" && isInternalHref(props.href)) {
      return React.createElement(props.component, {
        ...omit(props, "component", "platform", "href"),
        ...{ to: props.href, ref },
      });
    }

    if (props.platform === "tanstack" && isInternalHref(props.href)) {
      return React.createElement(props.component, {
        ...omit(props, "component", "platform", "href"),
        ...{ to: props.href, ref },
      });
    }

    return <a {...omit(props, "component", "platform")} ref={ref} />;
  }
);

function isInternalHref(href: string): boolean {
  return /^\/(?!\/)/.test(href);
}
