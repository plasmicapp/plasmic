/**
 * This file will be overwritten by Plasmic; don't edit.
 */

import React from "react";

export default function MaybeJsBundleThemeProvider(props: {
  children: React.ReactNode;
}) {
  // No theme to be injected, so nothing to do.
  return <>{props.children}</>;
}
