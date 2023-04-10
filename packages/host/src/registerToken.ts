export type TokenType =
  | "color"
  | "spacing"
  | "font-family"
  | "font-size"
  | "line-height"
  | "opacity";

export interface TokenRegistration {
  name: string;
  displayName: string;
  value: string;
  type: TokenType;
}

declare global {
  interface Window {
    __PlasmicTokenRegistry: TokenRegistration[];
  }
}

const root = globalThis as any;

if (root.__PlasmicTokenRegistry == null) {
  root.__PlasmicTokenRegistry = [];
}

export default function registerToken(token: TokenRegistration) {
  root.__PlasmicTokenRegistry.push(token);
}
