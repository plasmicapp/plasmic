import * as monaco from "monaco-editor";
import { editor } from "monaco-editor";

export type IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
export type IAdvancedStandaloneCodeEditor = IStandaloneCodeEditor & {
  setHiddenAreas(ranges: { startLineNumber: number; endLineNumber: number }[]);
};
export type IEditorConstructionOptions =
  editor.IStandaloneEditorConstructionOptions;

// Needed code to have a hidden areas in the monaco editor
// that are impossible to edit/select. There are a lot of
// constants, and only work for hiding the first and last line for now.
// Copied from: https://github.com/microsoft/monaco-editor/issues/1452#issuecomment-554825415
export function isRangeSelection(s: monaco.Selection) {
  if (s.selectionStartLineNumber !== s.positionLineNumber) {
    return true;
  }
  if (s.selectionStartColumn !== s.positionColumn) {
    return true;
  }
  return false;
}

export function setUpWrappers(_editor: IAdvancedStandaloneCodeEditor) {
  _editor.setPosition({
    column: 0,
    lineNumber: 2,
  });
  /* These signal to custom commands
     that the current cursor's position is in the end/start of the editable range */
  const contextSOR = _editor.createContextKey<boolean>("startOfEditable", true),
    contextEOR = _editor.createContextKey<boolean>("endOfEditable", false);

  const restrictSelections = (selections: monaco.Selection[] | null) => {
    selections = selections || _editor.getSelections()!;
    let resetSelections = false;
    const model = _editor.getModel()!;
    const maxLine = model.getLineCount() - 1;
    const lastLineCol = model.getLineContent(Math.max(maxLine, 1)).length + 1;

    contextEOR.set(false);
    contextSOR.set(false);

    for (const selection of selections) {
      if (selection.selectionStartLineNumber < 2) {
        (selection as any).selectionStartLineNumber = 2;
        (selection as any).selectionStartColumn = 1;
        resetSelections = true;
      }
      if (selection.positionLineNumber < 2) {
        (selection as any).positionLineNumber = 2;
        (selection as any).positionColumn = 1;
        resetSelections = true;
      }
      if (selection.selectionStartLineNumber > maxLine) {
        (selection as any).selectionStartLineNumber = maxLine;
        (selection as any).selectionStartColumn = lastLineCol;
        resetSelections = true;
      }
      if (selection.positionLineNumber > maxLine) {
        (selection as any).positionLineNumber = maxLine;
        (selection as any).positionColumn = lastLineCol;
        resetSelections = true;
      }
      /* Get if any of the cursors happened to be in the beginning/end
              of the editable range, so that we can block Delete/Backspace behavior.
              Range selections are safe, as they delete the selected content,
              not that is behind/in front of them. */
      if (!isRangeSelection(selection)) {
        if (
          selection.selectionStartLineNumber === 2 &&
          selection.selectionStartColumn === 1
        ) {
          contextSOR.set(true);
        }
        if (
          selection.positionLineNumber === maxLine &&
          selection.positionColumn === lastLineCol
        ) {
          contextEOR.set(true);
        }
      }
    }
    if (resetSelections) {
      _editor.setSelections(selections);
    }
  };

  // Turns out the Delete and Backspace keys do not produce a keyboard event but commands
  // These commands overlay the default ones, thus cancelling the default behaviour
  // @see https://github.com/microsoft/monaco-editor/issues/940
  const voidFunction = function () {
    void 0; // magic!
  };
  _editor.addCommand(monaco.KeyCode.Backspace, voidFunction, "startOfEditable");
  _editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backspace,
    voidFunction,
    "startOfEditable"
  );
  _editor.addCommand(
    monaco.KeyMod.Shift | monaco.KeyCode.Backspace,
    voidFunction,
    "startOfEditable"
  );
  _editor.addCommand(
    monaco.KeyMod.Alt | monaco.KeyCode.Backspace,
    voidFunction,
    "startOfEditable"
  );
  _editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Backspace,
    voidFunction,
    "startOfEditable"
  );
  _editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.Backspace,
    voidFunction,
    "startOfEditable"
  );
  _editor.addCommand(
    monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.Backspace,
    voidFunction,
    "startOfEditable"
  );
  _editor.addCommand(
    monaco.KeyMod.CtrlCmd |
      monaco.KeyMod.Shift |
      monaco.KeyMod.Alt |
      monaco.KeyCode.Backspace,
    voidFunction,
    "startOfEditable"
  );
  _editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Delete,
    voidFunction,
    "endOfEditable"
  );
  _editor.addCommand(monaco.KeyCode.Delete, voidFunction, "endOfEditable");

  // These cheat on the replace widget so that it cannot replace anything in the wrapper.
  // Done by temporarily switching to "replace in selection" mode and back.
  // Atomic replacements "work as expected" without this, for some reason or another.
  const find = _editor.getContribution("editor.contrib.findController") as any;
  const oldReplaceAll = find.replaceAll.bind(find);
  (find as any).replaceAll = function replaceAll() {
    const oldSelections = _editor.getSelections()
      ? [...(_editor.getSelections() ?? [])]
      : [];
    const oldSearchScope = find._state.searchScope;
    const oldGetFindScope = find._model._decorations.getFindScope;
    if (!oldSearchScope) {
      // Make up a new replacement scope
      const model = _editor.getModel()!;
      const maxLine = model.getLineCount() - 1;
      const lastLineCol = model.getLineContent(Math.max(maxLine, 1)).length + 1;
      const scope = {
        endColumn: lastLineCol,
        endLineNumber: maxLine,
        positionColumn: 1,
        positionLineNumber: 2,
        selectionStartColumn: lastLineCol,
        selectionStartLineNumber: maxLine,
        startColumn: 1,
        startLineNumber: 2,
      };
      find._state.change(
        {
          searchScope: {
            ...scope,
          },
        },
        true
      );
      _editor.setSelection(scope);
      find._model._decorations.getFindScope = function getFindScope() {
        return scope;
      };
    }

    oldReplaceAll();

    // Bring the previous editor state back
    find._model._decorations.getFindScope = oldGetFindScope;
    _editor.setSelections(oldSelections);
    find._state.change(
      {
        searchScope: oldSearchScope,
      },
      true
    );
    find._widget._updateSearchScope();
    restrictSelections(null);
  };

  // Clamp selections so they can't select wrapping lines
  _editor.onDidChangeCursorSelection((evt) => {
    const selections = [evt.selection, ...evt.secondarySelections];
    restrictSelections(selections);
  });

  const model = _editor.getModel()!;
  const lastLine = model.getLineCount();
  _editor.setHiddenAreas([
    {
      startLineNumber: 1,
      endLineNumber: 1,
    },
    {
      startLineNumber: lastLine,
      endLineNumber: lastLine,
    },
  ]);
}
