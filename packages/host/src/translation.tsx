import React from "react";

export type PlasmicTranslator = (
  str: string,
  opts?: {
    components?: {
      [key: string]: React.ReactElement;
    };
  }
) => React.ReactNode;

export interface PlasmicI18NContextValue {
  translator?: PlasmicTranslator;
  tagPrefix?: string;
}

export const PlasmicTranslatorContext = React.createContext<
  PlasmicI18NContextValue | PlasmicTranslator | undefined
>(undefined);

export function usePlasmicTranslator() {
  const _t = React.useContext(PlasmicTranslatorContext);
  const translator = _t
    ? typeof _t === "function"
      ? _t
      : _t.translator
    : undefined;
  return translator;
}
