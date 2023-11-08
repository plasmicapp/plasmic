import React from "react";
export type ScreenValue = "Unnamed Variant";
export const ScreenContext = React.createContext<ScreenValue | undefined>(
  undefined
);
export default ScreenContext;
