import { Node } from "@babel/types";
import cloneNodeImpl from "./cloneNode";

export const cloneNode: <T extends Node>(
  n: T,
  deep?: boolean,
  withoutLoc?: boolean,
  cloneNodeHook?: (n: T) => T | undefined
) => T = cloneNodeImpl as any;
