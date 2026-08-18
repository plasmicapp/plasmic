import { withUndoBatching } from "@/wab/client/components/canvas/undo-batching";
import { Editor, Transforms, createEditor } from "slate";
import { DOMEditor } from "slate-dom";
import { HistoryEditor, withHistory } from "slate-history";

const LONG_PAUSE_MS = 2000;
const SHORT_PAUSE_MS = 100;

const mkEditor = () => {
  const editor = withUndoBatching(withHistory(createEditor()), {
    HistoryEditor,
    DOMEditor,
  });
  editor.children = [{ type: "paragraph", children: [{ text: "" }] }];
  Transforms.select(editor, Editor.end(editor, []));
  return editor;
};

/**
 * Types `text` a character at a time, as a user would. Awaiting between
 * keystrokes lets Slate flush `editor.operations`, which is what marks each
 * keystroke as its own user action.
 */
const type = async (editor: Editor, text: string) => {
  for (const char of text) {
    Transforms.insertText(editor, char);
    await Promise.resolve();
  }
};

const undo = async (editor: Editor) => {
  editor.undo();
  await Promise.resolve();
};

describe("withUndoBatching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("undoes an uninterrupted run of typing in one step", async () => {
    const editor = mkEditor();
    await type(editor, "hello");

    await undo(editor);

    expect(Editor.string(editor, [])).toBe("");
  });

  it("starts a new batch after a pause, so undo drops only the last run", async () => {
    const editor = mkEditor();
    await type(editor, "hello");
    vi.setSystemTime(LONG_PAUSE_MS);
    await type(editor, " world");

    await undo(editor);

    expect(Editor.string(editor, [])).toBe("hello");
  });

  it("keeps a pause shorter than the threshold in the same batch", async () => {
    const editor = mkEditor();
    await type(editor, "hello");
    vi.setSystemTime(SHORT_PAUSE_MS);
    await type(editor, " world");

    await undo(editor);

    expect(Editor.string(editor, [])).toBe("");
  });

  it("does not merge the next keystroke into the batch an undo restored", async () => {
    const editor = mkEditor();
    await type(editor, "hello");
    vi.setSystemTime(LONG_PAUSE_MS);
    await type(editor, " world");
    await undo(editor);

    // No pause before this keystroke, so only the reset on undo/redo keeps it
    // out of the "hello" batch.
    await type(editor, "!");
    await undo(editor);

    expect(Editor.string(editor, [])).toBe("hello");
  });
});
