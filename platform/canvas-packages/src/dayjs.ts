import dayjs from "dayjs";
import { registerLibrary } from "register-library";
import types from "./generated-types/dayjs.json";

export function register() {
  registerLibrary(dayjs, {
    name: "hostless-dayjs",
    importPath: "dayjs",
    jsIdentifier: "dayjs",
    importType: "default",
    isSyntheticDefaultImport: true,
    ...types,
  });
}
register();
