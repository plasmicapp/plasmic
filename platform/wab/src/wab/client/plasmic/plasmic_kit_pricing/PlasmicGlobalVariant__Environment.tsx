/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

import * as React from "react";

export type EnvironmentValue = "website";
export const EnvironmentContext = React.createContext<
  EnvironmentValue | undefined
>("PLEASE_RENDER_INSIDE_PROVIDER" as any);
export function EnvironmentContextProvider(
  props: React.PropsWithChildren<{ value: EnvironmentValue | undefined }>
) {
  return (
    <EnvironmentContext.Provider value={props.value}>
      {props.children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  return React.useContext(EnvironmentContext);
}

export default EnvironmentContext;
/* prettier-ignore-end */
