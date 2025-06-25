import { PLATFORM } from "@/wab/client/platform";
import { ensureArray } from "@/wab/shared/common";
import isHotkey from "is-hotkey";

export interface Shortcut<Action extends string = string> {
  /** String identifier for this shortcut. */
  action: Action;
  /**
   * Array of combos that trigger this shortcut.
   *
   * See https://github.com/ccampbell/mousetrap for more info.
   */
  combos: string[];
  /**
   * Description of shortcut.
   *
   * Shown to the user in the shortcuts popup.
   */
  description: string;
  /**
   * Info about which contexts this shortcut can be used in.
   *
   * Shown to the user in the shortcuts popup.
   */
  context?: string;
}

export interface ShortcutGroup<Action extends string = string> {
  name: string;
  shortcuts: Shortcut<Action>[];
}

export type Shortcuts<Action extends string> = {
  [action in Action]: Shortcut<Action>;
};

export type ActionOf<T> = T extends Shortcuts<infer Action> ? Action : never;

interface AddShortcut {
  combos: string | string[];
  description: string;
  context?: string;
}

/** Useful for displaying non-keyboard shortcuts. */
export function mkNoActionShortcuts(...shortcuts: AddShortcut[]): Shortcut[] {
  const transformedShortcuts: Shortcut[] = shortcuts.map(
    ({ combos, ...rest }) => {
      const combosArray = ensureArray(combos);
      return {
        action: `!${combosArray.join(",")}`,
        combos: combosArray,
        ...rest,
      };
    }
  );
  return maybeTransformCombos(transformedShortcuts);
}

/** Shortcut group. Ordering of the shortcuts is how they will be displayed to the user. */
export function mkShortcutGroup<Action extends string>(
  name: string,
  shortcuts: { [action in Action]: AddShortcut }
): ShortcutGroup<Action> {
  let transformedShortcuts: Shortcut<Action>[] = (
    Object.entries(shortcuts) as [Action, AddShortcut][]
  ).map(([action, { combos, ...rest }]) => ({
    action: action as Action,
    combos: ensureArray(combos),
    ...rest,
  }));
  transformedShortcuts = maybeTransformCombos(transformedShortcuts);
  return {
    name,
    shortcuts: transformedShortcuts,
  };
}

export function shortcutGroupToDict<Action extends string>(
  group: ShortcutGroup<Action>
): Shortcuts<Action> {
  return Object.fromEntries(
    group.shortcuts.map((shortcut) => [shortcut.action, shortcut])
  ) as Shortcuts<Action>;
}

export class ShortcutsMerger<Action extends string> {
  static new() {
    return new ShortcutsMerger<never>({});
  }

  private constructor(private readonly shortcuts: Shortcuts<Action>) {}

  add<NewAction extends string>(
    group: ShortcutGroup<NewAction>
  ): ShortcutsMerger<Action | NewAction> {
    return new ShortcutsMerger<Action | NewAction>({
      ...this.shortcuts,
      ...shortcutGroupToDict(group),
    });
  }

  result(): Shortcuts<Action> {
    return this.shortcuts;
  }
}

function maybeTransformCombos<Action extends string>(
  shortcuts: Shortcut<Action>[]
): Shortcut<Action>[] {
  if (PLATFORM === "osx") {
    return shortcuts.map((shortcut) => ({
      ...shortcut,
      combos: shortcut.combos.map((combo) =>
        combo.replace("ctrl", "command").replace("alt", "option")
      ),
    }));
  } else {
    return shortcuts;
  }
}

export function isSubmitKeyCombo(e: React.KeyboardEvent): boolean {
  return isHotkey("mod+enter")(e.nativeEvent);
}
