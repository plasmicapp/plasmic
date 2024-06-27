import {
  mkShortcutGroup,
  shortcutGroupToDict,
} from "@/wab/client/shortcuts/shortcut";

export const PREVIEW_SHORTCUTS = shortcutGroupToDict(
  mkShortcutGroup("Preview", {
    EXIT_PREVIEW_MODE: {
      combos: ["l", "esc"],
      description: "Exit Preview mode and return to Studio",
    },
  })
);
