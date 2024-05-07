// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */

import * as React from "react";
import { createUseScreenVariants } from "@plasmicapp/react-web";

export type EnvironmentValue = "website";
export const EnvironmentContext = React.createContext<
  EnvironmentValue | undefined
>("PLEASE_RENDER_INSIDE_PROVIDER" as any);

export function useEnvironment() {
  return React.useContext(EnvironmentContext);
}

export default EnvironmentContext;
/* prettier-ignore-end */
