import { registerLibrary } from "register-library";
import * as semver from "semver";
import types from "./generated-types/semver.json";

export function register() {
  registerLibrary(semver, {
    name: "hostless-semver",
    importPath: "semver",
    jsIdentifier: "semver",
    importType: "namespace",
    ...types,
  });
}

register();
