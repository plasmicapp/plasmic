import * as L from "lodash";
import { registerLibrary } from "register-library";
import types from "./generated-types/lodash.json";

export function register() {
  registerLibrary(L, {
    name: "hostless-lodash",
    importPath: "lodash",
    jsIdentifier: "lodash",
    importType: "namespace",
    ...types,
  });
}

register();
