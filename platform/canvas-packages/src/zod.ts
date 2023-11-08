import { registerLibrary } from "register-library";
import { z } from "zod";
import types from "./generated-types/zod.json";

export function register() {
  registerLibrary(z, {
    name: "hostless-zod",
    importPath: "zod",
    jsIdentifier: "zod",
    importType: "named",
    namedImport: "z",
    ...types,
  });
}

register();
