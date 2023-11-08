import * as papaParse from "papaparse";
import { registerLibrary } from "register-library";
import types from "./generated-types/papaparse.json";

export function register() {
  registerLibrary(papaParse, {
    name: "hostless-papaparse",
    importPath: "papaparse",
    jsIdentifier: "papaParse",
    importType: "namespace",
    ...types,
  });
}

register();
