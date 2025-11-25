// This file tries to track all the z-indexes we've defined.

export const zIndex = {
  quickModal: 4000,
  tour: 3000,
  popoverFrame: 2001,
  rightPaneModal: 2000,
  tourHighlightAboveMenus: 1051,
  dropdownMenu: 1050, // .ant-dropdown (e.g. right-click context menus)
  tourHighlight: 1049,
  popover: 1030, // .ant-popover (e.g. data picker)
  modal: 1000,
  bottomModal: 5,
} as const;
