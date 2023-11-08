import * as immer from "immer";
import { registerLibrary } from "register-library";
import types from "./generated-types/immer.json";

export function register() {
  registerLibrary(immer, {
    name: "hostless-immer",
    importPath: "immer",
    jsIdentifier: "immer",
    importType: "namespace",
    ...types,
  });
}

register();
