import { Node } from "@babel/types";
import { cloneNode } from "./cloneNodeWithHook";

export const cloneDeepWithHook = <T extends Node>(
  n: T,
  cloneNodeHook: (n: Node) => Node | undefined
): T => {
  return cloneNode(n, true, false, cloneNodeHook) as T;
};
