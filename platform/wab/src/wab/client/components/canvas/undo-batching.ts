import type { Editor } from "slate";
import type * as slateDom from "slate-dom";
import type * as slateHistory from "slate-history";

// A pause in typing longer than this starts a new undo batch.
const UNDO_BATCH_PAUSE_MS = 1000;

/**
 * By default slate-history records a run of typing as one undo batch no matter
 * how long the user pauses, so a single undo can wipe everything just typed.
 *
 * This HOC overrides apply to manually split if the user pauses typing for 1 second.
 * It must wrap `withHistory`, since it decides whether to split *before* the
 * history plugin reads that decision.
 *
 * `HistoryEditor` and `DOMEditor` are parameters rather than imports because
 * slate keeps its plugin state in module-level WeakMaps: they have to come from
 * the same slate instance that created `editor`, which for canvas means the
 * copies injected into that frame via `SubDeps`, not the studio's own imports.
 */
export function withUndoBatching<T extends Editor>(
  editor: T,
  {
    HistoryEditor,
    DOMEditor,
  }: {
    HistoryEditor: typeof slateHistory.HistoryEditor;
    DOMEditor: typeof slateDom.DOMEditor;
  }
): T {
  const { apply } = editor;
  let lastTypingTime = 0;

  editor.apply = (op) => {
    if (HistoryEditor.isSaving(editor) === false) {
      // History isn't recording: an undo/redo, or a `withoutSaving` block such
      // as an external value reset. Either way the next keystroke starts a new
      // batch.
      lastTypingTime = 0;
    } else if (
      // `operations.length === 0` means this is the first op of a user action.
      editor.operations.length === 0 &&
      (op.type === "insert_text" || op.type === "remove_text")
    ) {
      const now = Date.now();
      if (
        // Splitting mid-composition would chop up IME input.
        !DOMEditor.isComposing(editor) &&
        now - lastTypingTime > UNDO_BATCH_PAUSE_MS
      ) {
        HistoryEditor.setSplittingOnce(editor, true);
      }
      lastTypingTime = now;
    }

    apply(op);
  };

  return editor;
}
