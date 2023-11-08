import * as nanoid from "nanoid";
import { registerLibrary } from "register-library";
import types from "./generated-types/nanoid.json";

export function register() {
  registerLibrary(nanoid, {
    name: "hostless-nanoid",
    importPath: "nanoid",
    jsIdentifier: "nanoid",
    importType: "namespace",
    ...types,
  });
}

register();
