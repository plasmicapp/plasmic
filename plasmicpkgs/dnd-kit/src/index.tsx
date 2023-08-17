import { registerSortable } from "./sortable";
import { Registerable } from "./util";

export function registerAll(loader?: Registerable) {
  registerSortable(loader);
}

export * from "./sortable";
