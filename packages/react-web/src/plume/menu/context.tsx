import * as React from "react";
import type { TreeState } from "@react-stately/tree";
import type { BaseMenuProps } from "./menu";

export interface MenuContextValue {
  menuProps: BaseMenuProps;
  state: TreeState<any>;
}

export const MenuContext = React.createContext<MenuContextValue | undefined>(
  undefined
);
