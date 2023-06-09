import React from "react";

const PlasmicLinkContext = React.createContext<
  React.ComponentType<any> | undefined
>(undefined);

export function usePlasmicLinkMaybe():
  | React.ComponentType<React.ComponentProps<"a">>
  | undefined {
  return React.useContext(PlasmicLinkContext);
}

const AnchorLink = React.forwardRef(function AnchorLink(
  props: React.ComponentProps<"a">,
  ref: React.Ref<HTMLAnchorElement>
) {
  return <a {...props} ref={ref} />;
});

export function usePlasmicLink(): React.ComponentType<
  React.ComponentProps<"a">
> {
  const Link = React.useContext(PlasmicLinkContext);
  if (Link) {
    return Link;
  } else {
    return AnchorLink as React.ComponentType<React.ComponentProps<"a">>;
  }
}

export function PlasmicLinkProvider(props: {
  Link: React.ComponentType<any> | undefined;
  children?: React.ReactNode;
}) {
  const { Link, children } = props;
  return (
    <PlasmicLinkContext.Provider value={Link}>
      {children}
    </PlasmicLinkContext.Provider>
  );
}
