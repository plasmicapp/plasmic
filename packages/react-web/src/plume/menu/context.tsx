import * as React from "react";
import { TreeState } from "react-stately";
import { BaseMenuProps } from "./menu";

export interface MenuContextValue {
  menuProps: BaseMenuProps;
  state: TreeState<any>;
}

export const MenuContext = React.createContext<MenuContextValue | undefined>(
  undefined
);
