import pluralize from "pluralize";
import { registerLibrary } from "register-library";
import types from "./generated-types/pluralize.json";

export function register() {
  registerLibrary(pluralize, {
    name: "hostless-pluralize",
    importPath: "pluralize",
    jsIdentifier: "pluralize",
    importType: "default",
    isSyntheticDefaultImport: true,
    ...types,
  });
}

register();
