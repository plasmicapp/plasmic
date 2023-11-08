import { registerLibrary } from "register-library";
import * as uuid from "uuid";
import types from "./generated-types/uuid.json";

export function register() {
  registerLibrary(uuid, {
    name: "hostless-uuid",
    importPath: "uuid",
    jsIdentifier: "uuid",
    importType: "namespace",
    ...types,
  });
}
register();
