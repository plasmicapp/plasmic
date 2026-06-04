/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

import * as React from "react";

export type CodegenTypeValue = "loader" | "codegen" | "loader2";
export const CodegenTypeContext = React.createContext<
  CodegenTypeValue | undefined
>("PLEASE_RENDER_INSIDE_PROVIDER" as any);
export function CodegenTypeContextProvider(
  props: React.PropsWithChildren<{ value: CodegenTypeValue | undefined }>
) {
  return (
    <CodegenTypeContext.Provider value={props.value}>
      {props.children}
    </CodegenTypeContext.Provider>
  );
}

export function useCodegenType() {
  return React.useContext(CodegenTypeContext);
}

export default CodegenTypeContext;
/* prettier-ignore-end */
