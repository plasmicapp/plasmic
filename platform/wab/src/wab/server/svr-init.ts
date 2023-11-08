import * as Globalize from "globalize";
export function initializeGlobals() {
  (global as any).PUBLICPATH = "node";
  (global as any).DEPLOYENV = "node";
  (global as any).Globalize = Globalize;
}
