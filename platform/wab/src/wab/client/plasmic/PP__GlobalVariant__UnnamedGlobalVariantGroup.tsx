import React from "react";
export type UnnamedGlobalVariantGroupValue = "Unnamed Variant";
export const UnnamedGlobalVariantGroupContext = React.createContext<
  UnnamedGlobalVariantGroupValue | undefined
>(undefined);
export default UnnamedGlobalVariantGroupContext;
