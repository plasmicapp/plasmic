import * as React from "react";
import type { ListState } from "@react-stately/list";

export const SelectContext = React.createContext<ListState<any> | undefined>(
  undefined
);
