// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import * as React from "react";
import * as p from "@plasmicapp/react-web";
export type CodegenTypeValue = "loader" | "codegen" | "loader2";
export const CodegenTypeContext = React.createContext<
  CodegenTypeValue | undefined
>("PLEASE_RENDER_INSIDE_PROVIDER" as any);

export function useCodegenType() {
  return React.useContext(CodegenTypeContext);
}

export default CodegenTypeContext;
/* prettier-ignore-end */
