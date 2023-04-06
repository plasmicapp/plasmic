import { registerSimpleChart } from "./simple-chart";
import { Registerable } from "./utils";

export function registerAll(loader?: Registerable) {
  registerSimpleChart(loader);
}
