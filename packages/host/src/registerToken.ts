export type TokenType =
  | "color"
  | "spacing"
  | "font-family"
  | "font-size"
  | "line-height"
  | "opacity";

export interface TokenRegistration {
  /**
   * Name for this token; should be stable across updates
   */
  name: string;
  /**
   * Value for the token, which can either be a valid css value or a css reference
   * to a css variable provided by your host app, like `var(--my-token)`
   */
  value: string;
  /**
   * Type of token
   */
  type: TokenType;
  /**
   * Optional display name to use for this token, if you'd like to use a friendlier
   * name to display to Studio users
   */
  displayName?: string;
  /**
   * By default, if this token is a css variable reference like `var(--my-token)`,
   * then it is assumed that `--my-token` is defined on `:root`.  If it is defined
   * in another element, then you can pass in a selector for that element,
   * like `.themeRoot`.
   */
  selector?: string;
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
