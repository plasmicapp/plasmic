import stringify from "fast-stringify";
import { registerLibrary } from "register-library";
import types from "./generated-types/fast-stringify.json";

export function register() {
  registerLibrary(stringify, {
    name: "hostless-fast-stringify",
    importPath: "fast-stringify",
    jsIdentifier: "stringify",
    importType: "default",
    ...types,
  });
}

register();
