// This file tries to track all the z-indexes we've defined.

import type { Tagged } from "type-fest";

export type ZIndex = Tagged<number, "z-index">;
type ToZIndexes<T> = { readonly [K in keyof T]: ZIndex };

const zIndex_ = {
  quickModal: 4000,
  tour: 3000,
  dropdownMenu: 1050, // .ant-dropdown (e.g. right-click context menus)
  tourHighlight: 1049,
  dataPicker: 1040,
  popover: 1030, // .ant-popover (e.g. data picker), PopoverFrame
  modal: 1000,
  floating: 900, // persistent floating windows (comments, copilot)
  rightPaneModal: 6,
  bottomModal: 5,
} as const;
export const zIndex = zIndex_ as ToZIndexes<typeof zIndex_>;
