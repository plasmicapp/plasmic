import Mousetrap, { ExtendedKeyboardEvent } from "mousetrap";
import { useEffect, useState } from "react";
import { Shortcuts } from "@/wab/client/shortcuts/shortcut";
import { extractEventProps, trackEvent } from "@/wab/client/tracking";

/** Always allow these combos, no matter where the focus is. */
const ALWAYS_ALLOWED_COMBOS = new Set(["esc"]);

/**
 * Combos that should not trigger shortcuts on focusable elements (tabIndex >= 0).
 */
const FOCUSABLE_DISALLOWED_COMBOS = new Set([
  "enter", // click (e.g. buttons, links)
  "tab", // tab to next focusable element
  "shift+tab", // tab to previous focusable element
]);

/**
 * Input types that should not trigger shortcuts.
 * These are input types where keyboard interaction is expected.
 *
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types
 */
const INPUT_DISALLOWED_TYPES: ReadonlySet<string> = new Set([
  "date",
  "datetime",
  "datetime-local",
  "email",
  "month",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "time",
  "url",
  "week",
]);

/**
 * If not handled, return `false`. Any other value will be considered as handled.
 *
 * If handled, preventDefault() and stopPropagation() will be called to prevent event bubbling.
 */
export type ShortcutHandler =
  | ((e: ExtendedKeyboardEvent, combo: string) => false)
  | ((e: ExtendedKeyboardEvent, combo: string) => unknown);

export type ShortcutHandlers<Action extends string> = {
  [action in Action]?: ShortcutHandler;
};

type ElementCallback = (el: Element | null) => void;

/**
 * Binds shortcut handlers to an element.
 *
 * Invoke returned function to unbind.
 */
export function bindShortcutHandlers<Action extends string>(
  target: Element | Document,
  shortcuts: Shortcuts<Action>,
  handlers: ShortcutHandlers<Action>,
  shouldHandle?: (
    event: Mousetrap.ExtendedKeyboardEvent,
    element: Element
  ) => boolean
): () => void {
  const mousetrap = new Mousetrap(
    target instanceof Document ? undefined : target
  );

  // Some of our code uses checks like `element instanceof HTMLElement`.
  // However, this may not work if the element is in an iframe,
  // because the iframe uses a completely independent set of prototypes.
  // In order to make this code work in an iframe, we to qualify prototypes
  // with the window of the target element, e.g.
  // `element instanceof win.HTMLElement`.
  const win =
    target instanceof Document
      ? window
      : target.ownerDocument.defaultView || window;

  // return true if the callback should be stopped (i.e. don't handle)
  mousetrap.stopCallback = (event, element, combo) => {
    if (element instanceof win.HTMLElement) {
      if (ALWAYS_ALLOWED_COMBOS.has(combo)) {
        return false;
      }

      // Stop callback for certain combos if element is focusable
      if (element.tabIndex >= 0 && FOCUSABLE_DISALLOWED_COMBOS.has(combo)) {
        return true;
      }

      // Stop callback for all combos if element expects keyboard events
      // Based on Mousetrap's default stopCallback implementation
      // https://github.com/ccampbell/mousetrap/blob/master/mousetrap.js
      const doesInputExpectKeyEvents =
        element.isContentEditable ||
        (element instanceof win.HTMLInputElement &&
          INPUT_DISALLOWED_TYPES.has(element.type)) ||
        element instanceof win.HTMLSelectElement ||
        element instanceof win.HTMLTextAreaElement;
      if (doesInputExpectKeyEvents) {
        return true;
      }
    }

    if (shouldHandle && !shouldHandle(event, element)) {
      return true;
    }

    return false;
  };

  for (const [action, handler] of Object.entries(handlers) as [
    Action,
    ShortcutHandler
  ][]) {
    const shortcut = shortcuts[action];
    if (!shortcut) {
      console.error(
        `failed to find shortcut for handler with action ${action}`
      );
      continue;
    }

    mousetrap.bind(shortcut.combos, (event, combo) => {
      const eventName = "Shortcut key";
      const eventProps = {
        combos: shortcut.combos,
        action: shortcut.action,
        combo,
        ...extractEventProps(event.target),
      };
      trackEvent(eventName, eventProps);

      // Mousetrap calls `preventDefault` and `stopPropagation` if `false` is returned.
      // This is a bit confusing, because we return `true` on success.
      // So for our internal API, we negate the return value.
      return handler(event, combo) === false;
    });
  }
  return () => {
    mousetrap.reset();
  };
}

/** Binds shortcut handlers to an element. */
export function useBindShortcutHandlers<Action extends string>(
  target: Element | Document,
  shortcuts: Shortcuts<Action>,
  handlers: ShortcutHandlers<Action>
): void {
  useEffect(() => {
    return bindShortcutHandlers(target, shortcuts, handlers);
  }, [target, shortcuts, handlers]);
}

/**
 * Binds shortcut handlers to an element via ref.
 *
 * This hook returns a callback that binds shortcut handlers when an element is mounted.
 * To use, pass the callback into an element's `ref` prop.
 *
 * ```tsx
 * function YourComponent() {
 *   const bind = useBindShortcutHandlersToRef(yourShortcuts, yourHandlers);
 *   return <FocusableElement ref={bind} />;
 * }
 * ```
 *
 * Keep in mind that the element must be focusable (i.e. tabIndex >= 0) to receive key events.
 */
export function useBindShortcutHandlersToRef<Action extends string>(
  shortcuts: Shortcuts<Action>,
  handlers: ShortcutHandlers<Action>
): ElementCallback {
  const [element, setElement] = useState<Element | null>(null);
  useEffect(() => {
    if (!element) {
      return;
    }
    return bindShortcutHandlers(element, shortcuts, handlers);
  }, [element, shortcuts, handlers]);
  return (el) => setElement(el);
}
