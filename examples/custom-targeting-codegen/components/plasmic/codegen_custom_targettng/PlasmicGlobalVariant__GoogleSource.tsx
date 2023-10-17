// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */

import * as React from "react";
import * as p from "@plasmicapp/react-web";

export type GoogleSourceValue = "override";
export const GoogleSourceContext = React.createContext<
  GoogleSourceValue | undefined
>("PLEASE_RENDER_INSIDE_PROVIDER" as any);

export function useGoogleSource() {
  return React.useContext(GoogleSourceContext);
}

export default GoogleSourceContext;
/* prettier-ignore-end */
