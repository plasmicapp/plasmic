import { marked } from "marked";
import { registerLibrary } from "register-library";
import types from "./generated-types/marked.json";

export function register() {
  registerLibrary(marked, {
    name: "hostless-marked",
    importPath: "marked",
    jsIdentifier: "marked",
    importType: "named",
    namedImport: "marked",
    ...types,
  });
}

register();
