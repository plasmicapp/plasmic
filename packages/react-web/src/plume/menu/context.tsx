import { TreeState } from "@react-stately/tree";
import * as React from "react";
import { BaseMenuProps } from "./menu";

export interface MenuContextValue {
  menuProps: BaseMenuProps;
  state: TreeState<any>;
}

export const MenuContext = React.createContext<MenuContextValue | undefined>(
  undefined
);
