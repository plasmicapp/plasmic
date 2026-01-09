import { useFocusManager } from "@/wab/client/components/aria-utils";
import { isKeyHotkey } from "is-hotkey";
import * as React from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { FocusScope } from "react-aria";

export type ModalScopeProps = Omit<
  React.ComponentProps<"div">,
  "tabIndex" | "onKeyDown" | "onKeyUp" | "onKeyPress"
> & {
  allowKeyCombos?: string[] | string[][];
  containFocus?: boolean;
};

/**
 * For popup-like components (e.g. DataPicker) that behave like a modal.
 *
 * This component adds a wrapping <div> that trap focus and key events.
 */
export function ModalScope({ containFocus = true, ...props }: ModalScopeProps) {
  return (
    <FocusScope contain={containFocus} autoFocus restoreFocus>
      <ModalScopeInternal {...props} />
    </FocusScope>
  );
}

function ModalScopeInternal({
  children,
  allowKeyCombos = [],
  ...props
}: ModalScopeProps) {
  const containerElRef = useRef<HTMLDivElement | null>(null);
  // Sometimes FocusScope's autofocus doesn't work,
  // so manually focus the first element on layout.
  const focusManager = useFocusManager();
  useLayoutEffect(() => {
    setTimeout(() => {
      if (
        containerElRef.current &&
        !containerElRef.current.contains(document.activeElement)
      ) {
        focusManager.focusFirst();
      }
    });
  }, []);

  const keyboardEventHandlers = useMemo<React.ComponentProps<"div">>(() => {
    const handler = stopKeyboardEventPropagation(allowKeyCombos.flat());
    return {
      onKeyDown: handler,
      onKeyUp: handler,
      onKeyPress: handler,
    };
  }, [allowKeyCombos]);

  return (
    <div
      ref={containerElRef}
      {...keyboardEventHandlers}
      {...props}
      // Setting tabIndex -1 allows this div to be focused via clicking but not
      // tabbed to. This is necessary to prevent FocusScope's contain
      // functionality from causing unnecessary scrolling.
      // (see https://github.com/adobe/react-spectrum/issues/3371).
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

function stopKeyboardEventPropagation(
  allowKeyCombos: string[]
): React.KeyboardEventHandler {
  return (e) => {
    if (!isKeyHotkey(allowKeyCombos, e.nativeEvent)) {
      e.stopPropagation();
    }
  };
}
