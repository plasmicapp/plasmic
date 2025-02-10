// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */

import * as React from "react";
import { createUseScreenVariants } from "@plasmicapp/react-web";

export type ScreenValue = "desktopOnly";
export const ScreenContext = React.createContext<ScreenValue[] | undefined>(
  "PLEASE_RENDER_INSIDE_PROVIDER" as any
);

export const useScreenVariants = createUseScreenVariants(true, {
  desktopOnly: "(min-width:768px)",
});

export default ScreenContext;
/* prettier-ignore-end */
