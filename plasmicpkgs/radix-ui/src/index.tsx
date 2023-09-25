import { registerPopover } from "./popover";
import { registerDialog } from "./dialog";
import { Registerable } from "./reg-util";

export function registerAll(PLASMIC?: Registerable) {
  registerPopover(PLASMIC);
  registerDialog(PLASMIC);
}

export * from "./dialog";
export * from "./popover";
