import React from "react";
import { DEVFLAGS } from "../../devflags";

type DevFlagKeys = keyof typeof DEVFLAGS;

export function ifDevFlag<P extends object>(
  devFlag: DevFlagKeys,
  Component: React.ComponentType<P>
) {
  return ((props: P) =>
    DEVFLAGS[devFlag] ? (
      <Component {...props} />
    ) : null) as React.ComponentType<P>;
}
