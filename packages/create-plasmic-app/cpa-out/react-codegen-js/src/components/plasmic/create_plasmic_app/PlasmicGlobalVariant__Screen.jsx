/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import * as React from "react";
import { createUseScreenVariants } from "@plasmicapp/react-web";

export const ScreenContext = React.createContext(
  "PLEASE_RENDER_INSIDE_PROVIDER"
);

export function ScreenContextProvider(props) {
  return (
    <ScreenContext.Provider value={props.value}>
      {props.children}
    </ScreenContext.Provider>
  );
}

export const useScreenVariants = createUseScreenVariants(true, {
  desktopOnly: "(min-width:768px)",
});

export default ScreenContext;
/* prettier-ignore-end */
