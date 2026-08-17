import { STUDIO_SHORTCUTS } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { StudioCtxContext } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import { isKeyHotkey } from "is-hotkey";
import React, { useCallback, useContext, useState } from "react";

export interface UseUndoResult<T> {
  value: T;
  /** Whether `value` is an edit pushed against the *current* `initialValue` */
  isDirty: boolean;
  reset: (newInitialValue?: T) => void;
  push: (value: T) => void;
  /**
   * Handles undo and redo shortcuts.
   *
   * If not handled, returns null.
   *
   * If handled, returns an object telling you whether it's a undo or redo and
   * whether it was applied to the input or Studio.
   */
  handleKeyDown: (event: React.KeyboardEvent) => null | {
    where: "input" | "studio";
    change: "undo" | "redo";
  };
}

interface UndoState<T> {
  stack: T[];
  index: number;
  /** The initialValue the stack was seeded from */
  base: T;
}

/**
 * Undo/redo implementation that can trigger StudioCtx.undo/redo.
 */
export function useUndo<T>(initialValue: T): UseUndoResult<T> {
  const studioCtx = useContext(StudioCtxContext);

  const [{ stack, index, base }, setState] = useState<UndoState<T>>({
    stack: [initialValue],
    index: 0,
    base: initialValue,
  });
  const reset = useCallback(
    (newInitialValue?: T) => {
      const value = newInitialValue ?? initialValue;
      setState({
        stack: [value],
        index: 0,
        base: value,
      });
      return value;
    },
    [initialValue]
  );

  return {
    value: stack[index],
    isDirty: base === initialValue && index > 0,
    reset,
    push: (value) => {
      const nextIndex = index + 1;
      const nextStack = stack.slice(0, nextIndex);
      nextStack.push(value);
      setState({
        stack: nextStack,
        index: nextIndex,
        base: initialValue,
      });
    },
    handleKeyDown: (event) => {
      if (isKeyHotkey(STUDIO_SHORTCUTS.UNDO.combos, event.nativeEvent)) {
        const nextIndex = index - 1;
        if (nextIndex >= 0) {
          setState({
            stack,
            index: nextIndex,
            base,
          });
          event.preventDefault();
          event.stopPropagation();
          return {
            where: "input",
            change: "undo",
          };
        } else if (studioCtx) {
          spawn(studioCtx.undo());

          // Reset so that a subsequent redo triggers a StudioCtx.redo
          // This is possibly incorrect if the undo causes the initialValue to change,
          // but the current reset function has the old initialValue.
          reset();

          event.preventDefault();
          event.stopPropagation();
          return {
            where: "studio",
            change: "undo",
          };
        }
      } else if (isKeyHotkey(STUDIO_SHORTCUTS.REDO.combos, event.nativeEvent)) {
        const nextIndex = index + 1;
        if (nextIndex < stack.length) {
          setState({
            stack,
            index: nextIndex,
            base,
          });
          event.preventDefault();
          event.stopPropagation();
          return {
            where: "input",
            change: "redo",
          };
        } else if (studioCtx && stack.length === 1 && index === 0) {
          spawn(studioCtx.redo());
          event.preventDefault();
          event.stopPropagation();
          return {
            where: "studio",
            change: "redo",
          };
        }
      }

      return null;
    },
  };
}
