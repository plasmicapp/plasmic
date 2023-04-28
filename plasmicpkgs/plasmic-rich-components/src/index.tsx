import { registerRichLayout } from "./rich-layout";
import { registerRichTable } from "./rich-table";
import { Registerable } from "./utils";

export { RichLayout } from "./rich-layout";
export { RichTable, tableHelpers } from "./rich-table";

export function registerAll(loader?: Registerable) {
  registerRichLayout(loader);
  registerRichTable(loader);
}
