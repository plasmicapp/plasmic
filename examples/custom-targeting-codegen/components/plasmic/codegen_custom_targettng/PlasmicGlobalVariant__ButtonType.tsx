// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */

import * as React from "react";
import * as p from "@plasmicapp/react-web";

export type ButtonTypeValue = "dashed";
export const ButtonTypeContext = React.createContext<
  ButtonTypeValue | undefined
>("PLEASE_RENDER_INSIDE_PROVIDER" as any);

export function useButtonType() {
  return React.useContext(ButtonTypeContext);
}

export default ButtonTypeContext;
/* prettier-ignore-end */
