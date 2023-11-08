import md5 from "md5";
import { registerLibrary } from "register-library";
import types from "./generated-types/md5.json";

export function register() {
  registerLibrary(md5, {
    name: "hostless-md5",
    importPath: "md5",
    jsIdentifier: "md5",
    importType: "default",
    isSyntheticDefaultImport: true,
    ...types,
  });
}

register();
