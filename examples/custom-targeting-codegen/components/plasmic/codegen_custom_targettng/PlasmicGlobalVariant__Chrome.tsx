/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

import * as React from "react";

export type ChromeValue = "override";
export const ChromeContext = React.createContext<ChromeValue | undefined>(
  "PLEASE_RENDER_INSIDE_PROVIDER" as any
);
export function ChromeContextProvider(
  props: React.PropsWithChildren<{ value: ChromeValue | undefined }>
) {
  return (
    <ChromeContext.Provider value={props.value}>
      {props.children}
    </ChromeContext.Provider>
  );
}

export function useChrome() {
  return React.useContext(ChromeContext);
}

export default ChromeContext;
/* prettier-ignore-end */
