import * as dateFns from "date-fns";
import { registerLibrary } from "register-library";
import types from "./generated-types/date-fns.json";

export function register() {
  registerLibrary(dateFns, {
    name: "hostless-date-fns",
    importPath: "date-fns",
    jsIdentifier: "dateFns",
    importType: "namespace",
    ...types,
  });
}

register();
