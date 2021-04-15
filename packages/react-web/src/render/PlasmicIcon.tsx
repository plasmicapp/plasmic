import * as React from "react";

export function PlasmicIcon(
  props: React.ComponentProps<"svg"> & {
    PlasmicIconType: React.ComponentType;
  }
) {
  const { PlasmicIconType, ...rest } = props;
  return <PlasmicIconType {...rest} />;
}
