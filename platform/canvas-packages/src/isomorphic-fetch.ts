import fetch from "isomorphic-fetch";
import { registerLibrary } from "register-library";
import types from "./generated-types/isomorphic-fetch.json";

export function register() {
  registerLibrary(fetch, {
    name: "hostless-isomorphic-fetch",
    importPath: "isomorphic-fetch",
    jsIdentifier: "fetch",
    importType: "default",
    isSyntheticDefaultImport: true,
    ...types,
  });
}

register();
