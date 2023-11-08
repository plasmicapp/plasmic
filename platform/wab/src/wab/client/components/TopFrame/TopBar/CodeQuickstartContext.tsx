import { createContext } from "react";

export type CodeQuickstartContext = [boolean, (b: boolean) => void];

export const CodeQuickstartContext = createContext<
  CodeQuickstartContext | undefined
>(undefined);
