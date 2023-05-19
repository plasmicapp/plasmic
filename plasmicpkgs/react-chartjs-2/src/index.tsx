import { registerSimpleChart } from "./simple-chart";
import { Registerable } from "./utils";

export { SimpleChart } from "./simple-chart";

export function registerAll(loader?: Registerable) {
  registerSimpleChart(loader);
}
