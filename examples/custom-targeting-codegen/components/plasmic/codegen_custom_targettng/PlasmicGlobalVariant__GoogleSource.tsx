/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

import * as React from "react";

export type GoogleSourceValue = "override";
export const GoogleSourceContext = React.createContext<
  GoogleSourceValue | undefined
>("PLEASE_RENDER_INSIDE_PROVIDER" as any);
export function GoogleSourceContextProvider(
  props: React.PropsWithChildren<{ value: GoogleSourceValue | undefined }>
) {
  return (
    <GoogleSourceContext.Provider value={props.value}>
      {props.children}
    </GoogleSourceContext.Provider>
  );
}

export function useGoogleSource() {
  return React.useContext(GoogleSourceContext);
}

export default GoogleSourceContext;
/* prettier-ignore-end */
