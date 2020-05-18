import { cloneNode } from "./cloneNodeWithHook";
import { Node } from "@babel/types";

export const cloneDeepWithHook = <T extends Node>(
  n: T,
  cloneNodeHook: (n: Node) => Node | undefined
): T => {
  return cloneNode(n, true, false, cloneNodeHook) as T;
};