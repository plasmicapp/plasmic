import { ListState } from "@react-stately/list";
import * as React from "react";

export const SelectContext = React.createContext<ListState<any> | undefined>(
  undefined
);
