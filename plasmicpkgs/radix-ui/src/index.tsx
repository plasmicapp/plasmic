import { Registerable } from "./reg-util";
import { registerPopover } from "./popover";
import { registerDialog } from "./dialog";
import { registerTooltip } from "./tooltip";

export function registerAll(PLASMIC?: Registerable) {
  registerPopover(PLASMIC);
  registerDialog(PLASMIC);
  registerTooltip(PLASMIC);
}

export * from "./dialog";
export * from "./popover";
export * from "./tooltip";
export { popoverProps } from "./util";
export { PopoverExtraProps } from "./util";
