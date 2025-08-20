import {
  ActionOf,
  mkShortcutGroup,
  ShortcutsMerger,
} from "@/wab/client/shortcuts/shortcut";
import { asOne, ensure } from "@/wab/shared/common";
import {
  ARENA_LOWER,
  FRAME_CAP,
  FRAME_LOWER,
  HORIZ_CONTAINER_LOWER,
  VARIANT_LOWER,
  VERT_CONTAINER_LOWER,
} from "@/wab/shared/Labels";

export const TOOLS_SHORTCUT_GROUP = mkShortcutGroup("Tools", {
  RECT: {
    combos: "r",
    description: "Insert or draw a rectangular block",
  },
  HORIZ_STACK: {
    combos: "h",
    description: `Insert or draw a ${HORIZ_CONTAINER_LOWER}`,
  },
  VERT_STACK: {
    combos: "v",
    description: `Insert or draw a ${VERT_CONTAINER_LOWER}`,
  },
  TEXT: {
    combos: "t",
    description: "Insert or draw a text block",
  },
  STACK: {
    combos: "s",
    description:
      "Insert or draw a stack; a wide box is horizontal, a tall box is vertical",
  },
});

export const VIEW_SHORTCUT_GROUP = mkShortcutGroup("View", {
  ZOOM_IN: {
    combos: ["+", "=", "ctrl++", "ctrl+=", "ctrl+shift+="],
    description: "Zoom in",
  },
  ZOOM_OUT: {
    combos: ["-", "_", "ctrl+-", "ctrl+_", "ctrl+shift+-"],
    description: "Zoom out",
  },
  ZOOM_RESET: {
    combos: ["0", "shift+0", "ctrl+0"],
    description: "Reset zoom to 100%",
  },
  ZOOM_TO_FIT: {
    combos: ["shift+1"],
    description: "Zoom to fit everything in the " + ARENA_LOWER,
  },
  ZOOM_TO_SELECTION: {
    combos: ["shift+2"],
    description: "Zoom to fit current selection",
  },
  FOCUS_FRAME: {
    combos: "c",
    description: "Focus on current frame",
  },
  FOCUS_NEXT_FRAME: {
    combos: "n",
    description: "Focus on next frame",
  },
  FOCUS_PREV_FRAME: {
    combos: "shift+n",
    description: "Focus on previous frame",
  },
  OUTLINE_MODE: {
    combos: ["ctrl+alt+o"],
    description: "Toggle Outline mode",
  },
  PREV_ARENA: {
    combos: ["pageup"],
    description: "Switch to previous arena",
  },
  NEXT_ARENA: {
    combos: ["pagedown"],
    description: "Switch to next arena",
  },
  TOGGLE_PREVIEW_MODE: {
    combos: "l",
    description: "Toggle Preview mode",
  },
  TOGGLE_FOCUSED_MODE: {
    combos: "m",
    description: "Toggle Design mode",
  },
  TOGGLE_INTERACTIVE_MODE: {
    combos: "shift+i",
    description: "Toggle Interactive mode",
  },
});

export const CHROME_SHORTCUT_GROUP = mkShortcutGroup("Chrome", {
  TOGGLE_UI_COPILOT: {
    combos: "mod+k",
    description: "Toggle Copilot!",
  },
  SWITCH_TO_COPILOT_TAB: {
    combos: "alt+c",
    description: "Engage Copilot!",
  },
  SEARCH_PROJECT_ARENAS: {
    combos: ["p", "alt+p"],
    description: "Search components, pages and arenas",
  },
  SWITCH_TO_TREE_TAB: {
    combos: "alt+1",
    description: "Switch to Tree Tab",
  },
  SWITCH_TO_LINT_TAB: {
    combos: "alt+2",
    description: "Switch to Style Tokens Tab",
  },
  CLOSE_LEFT_PANEL: {
    combos: "alt+-",
    description: "Collapse the left panel",
  },
  SWITCH_TO_SETTINGS_TAB: {
    combos: "alt+shift+1",
    description: "Switch to Settings tab on the right",
  },
  SWITCH_TO_DESIGN_TAB: {
    combos: "alt+shift+2",
    description: "Switch to Design tab on the right",
  },
  SWITCH_TO_COMPONENT_TAB: {
    combos: "alt+shift+3",
    description: "Switch to Component Data tab on the right",
  },
});

export const MISC_SHORTCUT_GROUP = mkShortcutGroup("Misc", {
  SAVE: {
    combos: "ctrl+s",
    description: "Save",
  },
  UNDO: {
    combos: "ctrl+z",
    description: "Undo",
  },
  REDO: {
    combos: ["ctrl+y", "ctrl+shift+z"],
    description: "Redo",
  },
  DESELECT: {
    combos: ["esc"],
    description:
      "Cancels the current action: deselects the selected item, exits master component mode, exits freestyle drawing, etc.",
  },
  SHOW_SHORTCUTS: {
    combos: "?",
    description: "Show available keyboard shortcuts",
  },
});

export const SELECTION_SHORTCUT_GROUP = mkShortcutGroup("Selection", {
  NAV_PARENT: {
    combos: "shift+enter",
    description: "Select parent",
  },
  NAV_CHILD: {
    combos: "enter",
    description: "Select child",
  },
  NAV_PREV_SIBLING: {
    combos: "shift+tab",
    description: "Select previous sibling",
  },
  NAV_NEXT_SIBLING: {
    combos: "tab",
    description: "Select next sibling",
  },
});

export const EDIT_SHORTCUT_GROUP = mkShortcutGroup("Edit", {
  RENAME_ELEMENT: {
    combos: "ctrl+r",
    description: "Rename the focused element",
  },
  SHOW_ADD_DRAWER: {
    combos: ["q", "i"],
    description: "Open the drawer for inserting new things",
  },
  SHOW_VARIANTS_DRAWER: {
    combos: "w",
    description:
      "Open the variants drawer to configure variants to record or view",
  },
  TOGGLE_VARIANTS_RECORDING: {
    combos: "shift+w",
    description: "Toggle recording of active variants",
  },
  TOGGLE_VISIBILITY: {
    combos: ["ctrl+shift+h"],
    description: "Toggle visibility of the selected item",
  },
  NUDGE_LEFT: {
    combos: ["left", "shift+left"],
    description:
      "Move selected item to the left, or show previous frame in Preview mode",
  },
  NUDGE_RIGHT: {
    combos: ["right", "shift+right"],
    description:
      "Move selected item to the right, or show next frame in Preview mode",
  },
  NUDGE_UP: {
    combos: ["up", "shift+up"],
    description: "Move selected item up",
  },
  NUDGE_DOWN: {
    combos: ["down", "shift+down"],
    description: "Move selected item down",
  },
  SHRINK_WIDTH: {
    combos: ["ctrl+left", "ctrl+shift+left"],
    description: "Shrink the width of the selected item",
  },
  GROW_WIDTH: {
    combos: ["ctrl+right", "ctrl+shift+right"],
    description: "Grow the width of the selected item",
  },
  SHRINK_HEIGHT: {
    combos: ["ctrl+up", "ctrl+shift+up"],
    description: "Shrink the height of the selected item",
  },
  GROW_HEIGHT: {
    combos: ["ctrl+down", "ctrl+shift+down"],
    description: "Grow the height of the selected item",
  },
  HIDE: {
    combos: ["del", "backspace"],
    description: `Hide element in non-base ${VARIANT_LOWER}, delete element in base ${VARIANT_LOWER}, delete slot, or delete ${FRAME_LOWER}`,
  },
  DELETE: {
    combos: ["ctrl+del", "ctrl+backspace"],
    description: "Delete selected item",
  },
  NAV_CHILD: {
    combos: "enter",
    description: "Edit text content",
  },
  ENTER_EDIT: {
    combos: "ctrl+enter",
    description: "Edit component",
  },
  GO_TO_COMPONENT_ARENA: {
    combos: "ctrl+alt+enter",
    description: "Go to component",
  },
  ENTER_EDIT_FRAME: {
    combos: "ctrl+shift+enter",
    description: `Edit component in a new ${FRAME_CAP}`,
  },
  EXTRACT_COMPONENT: {
    combos: "ctrl+alt+k",
    description: "Create new component",
  },
  CONVERT_SLOT: {
    combos: ["ctrl+alt+s", "ctrl+alt+shift+k"],
    description: "Convert to slot",
  },
  AUTOSIZE: {
    combos: "a",
    description: "Auto-size width and height",
  },
  TOGGLE_AUTOLAYOUT: {
    combos: "shift+a",
    description:
      "Toggle container layout between free, horizontal and vertical",
  },
  TOGGLE_HSTACK: {
    combos: "shift+h",
    description: "Set container layout to horizontal",
  },
  TOGGLE_VSTACK: {
    combos: "shift+v",
    description: "Set container layout to vertical",
  },
  COPY: {
    combos: "ctrl+c",
    description: "Copy element",
  },
  COPY_ELEMENT_STYLE: {
    combos: "ctrl+alt+c",
    description: "Copy element style",
  },
  PASTE: {
    combos: "ctrl+v",
    description: "Paste element (as child)",
  },
  PASTE_AS_SIBLING: {
    combos: "ctrl+shift+v",
    description: "Paste element (as sibling)",
  },
  PASTE_ELEMENT_STYLE: {
    combos: "ctrl+alt+v",
    description: "Paste element style",
  },
  DUPLICATE: {
    combos: "ctrl+d",
    description: "Duplicate",
  },
  MOVE_LEFT: {
    combos: ["ctrl+["],
    description: "Move selected item to be before its sibling",
  },
  MOVE_RIGHT: {
    combos: ["ctrl+]"],
    description: "Move selected item to be after its sibling",
  },
  MOVE_HOME: {
    combos: ["ctrl+shift+["],
    description: "Move selected item to the beginning of the container",
  },
  MOVE_END: {
    combos: ["ctrl+shift+]"],
    description: "Move selected item to the end of the container",
  },
  WRAP_HSTACK: {
    combos: ["shift+alt+h", "ctrl+alt+shift+h"],
    description: `Wrap the selected item in a ${HORIZ_CONTAINER_LOWER}`,
  },
  WRAP_VSTACK: {
    combos: ["shift+alt+v", "ctrl+alt+shift+v"],
    description: `Wrap the selected item in a ${VERT_CONTAINER_LOWER}`,
  },
  BOLD: {
    combos: ["ctrl+b"],
    description: "Set selected text font weight to bold",
  },
  DECREASE_FONT_SIZE: {
    combos: ["shift+ctrl+<", "shift+ctrl+,"],
    description: "Decrease font size of the selected item",
  },
  INCREASE_FONT_SIZE: {
    combos: ["shift+ctrl+>", "shift+ctrl+."],
    description: "Increase font size of the selected item",
  },
  DECREASE_FONT_WEIGHT: {
    combos: ["alt+ctrl+<", "alt+ctrl+,"],
    description: "Decrease font weight of the selected item",
  },
  INCREASE_FONT_WEIGHT: {
    combos: ["alt+ctrl+>", "alt+ctrl+."],
    description: "Increase font weight of the selected item",
  },
  CONVERT_LINK: {
    combos: "ctrl+alt+l",
    description: "Convert to link",
  },
});

export const STUDIO_SHORTCUTS = ShortcutsMerger.new()
  .add(TOOLS_SHORTCUT_GROUP)
  .add(VIEW_SHORTCUT_GROUP)
  .add(CHROME_SHORTCUT_GROUP)
  .add(EDIT_SHORTCUT_GROUP)
  .add(SELECTION_SHORTCUT_GROUP)
  .add(MISC_SHORTCUT_GROUP)
  .result();

export type StudioShortcutAction = ActionOf<typeof STUDIO_SHORTCUTS>;

export function getComboForAction(action: StudioShortcutAction) {
  const shortcut = ensure(STUDIO_SHORTCUTS[action], "must be a valid action");
  return ensure(
    asOne(shortcut.combos),
    "shortcut must have at least one key combo"
  );
}
