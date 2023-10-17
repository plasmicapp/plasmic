// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */

import * as React from "react";
import * as p from "@plasmicapp/react-web";

export type ChromeValue = "override";
export const ChromeContext = React.createContext<ChromeValue | undefined>(
  "PLEASE_RENDER_INSIDE_PROVIDER" as any
);

export function useChrome() {
  return React.useContext(ChromeContext);
}

export default ChromeContext;
/* prettier-ignore-end */
