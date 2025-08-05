/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

import { createUseScreenVariants } from "@plasmicapp/react-web";
import * as React from "react";

export type ScreenValue = "mobile";
export const ScreenContext = React.createContext<ScreenValue[] | undefined>(
  "PLEASE_RENDER_INSIDE_PROVIDER" as any
);
export function ScreenContextProvider(
  props: React.PropsWithChildren<{ value: ScreenValue[] | undefined }>
) {
  return (
    <ScreenContext.Provider value={props.value}>
      {props.children}
    </ScreenContext.Provider>
  );
}

export const useScreenVariants = createUseScreenVariants(true, {
  mobile: "(min-width:0px) and (max-width:768px)",
});

export default ScreenContext;
/* prettier-ignore-end */
