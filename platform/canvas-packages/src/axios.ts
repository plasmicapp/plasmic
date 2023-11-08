import axios, * as axiosExtras from "axios";
import { registerLibrary } from "register-library";
import types from "./generated-types/axios.json";

export function register() {
  registerLibrary(axios, {
    name: "hostless-axios",
    importPath: "axios",
    jsIdentifier: "axios",
    importType: "default",
    ...types,
  });

  registerLibrary(axiosExtras, {
    name: "hostless-axios-extras",
    importPath: "axios",
    jsIdentifier: "axiosExtras",
    importType: "namespace",
    ...types,
  });
}

register();
