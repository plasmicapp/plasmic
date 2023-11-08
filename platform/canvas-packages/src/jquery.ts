import jquery from "jquery";
import { registerLibrary } from "register-library";
import types from "./generated-types/jquery.json";

export function register() {
  registerLibrary(jquery, {
    name: "hostless-jquery",
    importPath: "jquery",
    jsIdentifier: "jquery",
    importType: "default",
    isSyntheticDefaultImport: true,
    ...types,
  });
}

register();
