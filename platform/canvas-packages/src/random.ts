import random, * as randomExtras from "random";
import { registerLibrary } from "register-library";
import types from "./generated-types/random.json";

export function register() {
  registerLibrary(random, {
    name: "hostless-random",
    importPath: "random",
    jsIdentifier: "random",
    importType: "default",
    ...types,
  });

  registerLibrary(randomExtras, {
    name: "hostless-random-extras",
    importPath: "random",
    jsIdentifier: "randomExtras",
    importType: "namespace",
    ...types,
  });
}

register();
