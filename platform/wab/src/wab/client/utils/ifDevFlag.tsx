import { DEVFLAGS } from "@/wab/shared/devflags";
import React from "react";

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
