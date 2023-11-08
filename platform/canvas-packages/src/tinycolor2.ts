import { registerLibrary } from "register-library";
import tinycolor2 from "tinycolor2";
import types from "./generated-types/tinycolor2.json";

export function register() {
  registerLibrary(tinycolor2, {
    name: "hostless-tinycolor2",
    importPath: "tinycolor2",
    jsIdentifier: "tinycolor2",
    importType: "default",
    isSyntheticDefaultImport: true,
    ...types,
  });
}

register();
