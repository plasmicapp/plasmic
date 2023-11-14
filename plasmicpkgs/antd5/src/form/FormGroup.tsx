import React from "react";
import { PathContext } from "./contexts";

export interface FormGroupProps {
  name: string;
  children: React.ReactNode;
}

export function FormGroup(props: FormGroupProps) {
  const pathCtx = React.useContext(PathContext);
  return (
    <PathContext.Provider
      value={{
        relativePath: [...pathCtx.relativePath, props.name],
        fullPath: [...pathCtx.fullPath, props.name],
      }}
    >
      {props.children}
    </PathContext.Provider>
  );
}
