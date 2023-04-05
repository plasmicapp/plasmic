import { registerRichLayout } from "./rich-layout";
import { registerRichTable } from "./rich-table";
import { Registerable } from "./utils";

export function registerAll(loader?: Registerable) {
  registerRichLayout(loader);
  registerRichTable(loader);
}
