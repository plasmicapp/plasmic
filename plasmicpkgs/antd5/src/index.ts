import {
  registerConfigProvider,
  registerTokens,
} from "./registerConfigProvider";
import { registerSelect } from "./registerSelect";
import { registerTable } from "./registerTable";
import { Registerable } from "./utils";

export function registerAll(loader?: Registerable) {
  registerConfigProvider(loader);
  registerTokens(loader);
  registerSelect(loader);
  registerTable(loader);
}
