import copyToClipboard from "copy-to-clipboard";
import { registerLibrary } from "register-library";
import types from "./generated-types/copy-to-clipboard.json";

export function register() {
  registerLibrary(copyToClipboard, {
    name: "hostless-copy-to-clipboard",
    importPath: "copy-to-clipboard",
    jsIdentifier: "copyToClipboard",
    importType: "default",
    isSyntheticDefaultImport: true,
    ...types,
  });
}

register();
