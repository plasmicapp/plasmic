/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

import * as React from "react";

export type ButtonTypeValue = "dashed";
export const ButtonTypeContext = React.createContext<
  ButtonTypeValue | undefined
>("PLEASE_RENDER_INSIDE_PROVIDER" as any);
export function ButtonTypeContextProvider(
  props: React.PropsWithChildren<{ value: ButtonTypeValue | undefined }>
) {
  return (
    <ButtonTypeContext.Provider value={props.value}>
      {props.children}
    </ButtonTypeContext.Provider>
  );
}

export function useButtonType() {
  return React.useContext(ButtonTypeContext);
}

export default ButtonTypeContext;
/* prettier-ignore-end */
