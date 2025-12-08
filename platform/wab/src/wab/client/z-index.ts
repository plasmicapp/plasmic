// This file tries to track all the z-indexes we've defined.

export const zIndex = {
  quickModal: 4000,
  tour: 3000,
  rightPaneModal: 6,
  tourHighlightAboveMenus: 1051,
  dropdownMenu: 1050, // .ant-dropdown (e.g. right-click context menus)
  tourHighlight: 1049,
  dataPicker: 1040,
  popover: 1030, // .ant-popover (e.g. data picker), PopoverFrame
  modal: 1000,
  bottomModal: 5,
} as const;
