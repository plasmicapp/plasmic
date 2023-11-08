import * as fakerExtras from "@faker-js/faker";
import { faker } from "@faker-js/faker";
import { registerLibrary } from "register-library";
import types from "./generated-types/@faker-js/faker.json";

export function register() {
  registerLibrary(faker, {
    name: "hostless-faker-js",
    importPath: "@faker-js/faker",
    jsIdentifier: "fakerJs",
    importType: "named",
    namedImport: "faker",
    ...types,
  });

  registerLibrary(fakerExtras, {
    name: "hostless-faker-js-extras",
    importPath: "@faker-js/faker",
    jsIdentifier: "fakerJsExtras",
    importType: "namespace",
    ...types,
  });
}

register();
