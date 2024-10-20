import { fixWorkerUrl } from "@/wab/client/monaco-worker-url";
import { noopFn } from "@/wab/shared/functions";
import { isValidJavaScriptCode } from "@/wab/shared/parser-utils";
import * as monaco from "monaco-editor";
import { useEffect, useState } from "react";

fixWorkerUrl();

const compilerOptions: monaco.languages.typescript.CompilerOptions = {
  // `moduleResolution` is needed for some import types to work, such as
  // `copy-to-clipboard` and `fast-stringify` libs
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  // Setting `lib` to `esnext` breaks types for `isomorphic-fetch` lib
  // lib: ["esnext"],
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  allowJs: true,
  noEmit: true,
};

monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
  compilerOptions
);
monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
  compilerOptions
);

export interface MonacoEditorActions {
  /**
   * Gets the value shown to the user.
   *
   * Do not use editor.getModel().getValue(), which may include hidden code
   * required to make IntelliSense features work.
   */
  getUserValue: () => string;

  /**
   * Replaces the value shown to the user WITHOUT resetting editor state.
   *
   * Do not use editor.getModel().setValue(), which will mess up the hidden
   * wrapper lines.
   */
  replaceUserValue: (value: string) => void;

  /**
   * Resets the value shown to the user and editor state (e.g. undo stack).
   *
   * Do not use editor.getModel().setValue(), which will mess up the hidden
   * wrapper lines.
   */
  resetUserValue: (value: string) => void;
}

/**
 * Initializes a Monaco Editor intended for on a single static file.
 *
 * Monaco is not a React component, so this hook bridges the gap to provide an
 * intuitive interface for it.
 *
 * Returns {@link MonacoEditorActions} for interface to the editor, when ready.
 */
export function useMonacoEditor(
  containerEl: HTMLElement | null | undefined,
  {
    modelFilePath,
    modelLanguage,
    modelDefaultValue,
    editorOptions,
    onBeforeEditorCreate,
    onAfterEditorCreate,
  }: {
    modelFilePath: string;
    modelLanguage: string;
    modelDefaultValue: string;
    editorOptions: Omit<
      monaco.editor.IStandaloneEditorConstructionOptions,
      "language" | "model" | "value"
    >;
    /**
     * For performing actions that need to happen before creating the editor
     * (e.g. adding libraries).
     */
    onBeforeEditorCreate?: () => Generator<
      monaco.IDisposable | null | undefined
    >;
    /**
     * For performing actions after the editor is ready to use
     * (e.g. bind event handlers).
     */
    onAfterEditorCreate?: (
      editor: monaco.editor.IStandaloneCodeEditor,
      editorActions: MonacoEditorActions
    ) => Generator<monaco.IDisposable | null | undefined>;
  }
): MonacoEditorActions | undefined {
  const [editorActions, setEditorActions] = useState<MonacoEditorActions>();

  // Creates the editor
  useEffect(() => {
    if (!containerEl) {
      return;
    }

    const disposables: monaco.IDisposable[] = [];

    if (onBeforeEditorCreate) {
      for (const d of onBeforeEditorCreate()) {
        if (d) {
          disposables.push(d);
        }
      }
    }

    const model = upsertMonacoModel(modelFilePath, modelLanguage, "");
    disposables.push(model);

    const editor = monaco.editor.create(containerEl, {
      ...editorOptions,
      model,
    });
    disposables.push(editor);

    const actions = initMonacoEditor(editor, model, modelLanguage);
    setEditorActions(actions);

    if (onAfterEditorCreate) {
      for (const d of onAfterEditorCreate(editor, actions)) {
        if (d) {
          disposables.push(d);
        }
      }
    }

    return () => {
      disposables.reverse().forEach((d) => {
        d.dispose();
      });
    };
  }, [containerEl, modelFilePath, modelLanguage]);
  // Recreates the editor if...
  // - containerEl changed (need to attach to new element)
  // - modelFilePath changed (need to set up new model)
  // - modelLanguage changed (need to set up language-specific behavior)

  // Updates the model content if...
  // - editorActions changed (see above)
  // - modelDefaultValue changed
  useEffect(() => {
    editorActions?.replaceUserValue(modelDefaultValue);
  }, [editorActions, modelDefaultValue]);

  return editorActions;
}

/** Initializes a Monaco Editor for the given language. */
export function initMonacoEditor(
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel,
  language: string
): MonacoEditorActions {
  if (language === "javascript" || language === "typescript") {
    return initMonacoEditorJs(editor, model);
  }

  return {
    getUserValue: () => model.getValue(),
    replaceUserValue: replaceUserValueFn(editor, model),
    resetUserValue: (value) => {
      model.setValue(value);
    },
  };
}

/**
 * Initializes a Monaco Editor to provide IntelliSense features for JavaScript,
 * including both as statements or as expressions.
 *
 * By default, some expressions don't work (e.g. object literals like
 * `{ foo: "bar" }`), so we flexibly add wrapping code as hidden lines
 * above and below the actual user code.
 *
 * This code is based on this comment:
 * https://github.com/microsoft/monaco-editor/issues/1452#issuecomment-554825415
 *
 * Code:
 * https://github.com/ct-js/ct-js/blob/v1.x/src/js/utils/codeEditorHelpers.js
 *
 * Returns {@link MonacoEditorActions}, which provides a simple interface
 * for getting and setting the value.
 */
function initMonacoEditorJs(
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel
): MonacoEditorActions {
  /* These signal to custom commands
     that the current cursor's position is in the end/start of the editable range */
  const contextSOR = editor.createContextKey<boolean>("startOfEditable", true);
  const contextEOR = editor.createContextKey<boolean>("endOfEditable", true);

  /** First line of editable range. */
  const getStartLineNumber = () =>
    Math.min(model.getLineCount(), PREFIX_LINE_COUNT + 1);
  /** Last line of editable range. */
  const getEndLineNumber = () =>
    Math.max(getStartLineNumber(), model.getLineCount() - SUFFIX_LINE_COUNT);

  const replaceUserValue = replaceUserValueFn(editor, model);

  /**
   * Restricts selections to the editable range and sets contextEOR/contextSOR.
   */
  const restrictSelections = (selections: monaco.Selection[] | null) => {
    selections = selections || editor.getSelections()!;
    let resetSelections = false;

    contextEOR.set(false);
    contextSOR.set(false);

    const startLineNumber = getStartLineNumber();
    const endLineNumber = getEndLineNumber();
    const endLineMaxColumn = model.getLineMaxColumn(endLineNumber);

    for (const selection of selections) {
      if (selection.selectionStartLineNumber < startLineNumber) {
        (selection as any).selectionStartLineNumber = startLineNumber;
        (selection as any).selectionStartColumn = 1;
        resetSelections = true;
      }
      if (selection.positionLineNumber < startLineNumber) {
        (selection as any).positionLineNumber = startLineNumber;
        (selection as any).positionColumn = 1;
        resetSelections = true;
      }
      if (selection.selectionStartLineNumber > endLineNumber) {
        (selection as any).selectionStartLineNumber = endLineNumber;
        (selection as any).selectionStartColumn = endLineMaxColumn;
        resetSelections = true;
      }
      if (selection.positionLineNumber > endLineNumber) {
        (selection as any).positionLineNumber = endLineNumber;
        (selection as any).positionColumn = endLineMaxColumn;
        resetSelections = true;
      }
      /* Get if any of the cursors happened to be in the beginning/end
              of the editable range, so that we can block Delete/Backspace behavior.
              Range selections are safe, as they delete the selected content,
              not that is behind/in front of them. */
      if (!isRangeSelection(selection)) {
        if (
          selection.selectionStartLineNumber === startLineNumber &&
          selection.selectionStartColumn === 1
        ) {
          contextSOR.set(true);
        }
        if (
          selection.positionLineNumber === endLineNumber &&
          selection.positionColumn === endLineMaxColumn
        ) {
          contextEOR.set(true);
        }
      }
    }
    if (resetSelections) {
      editor.setSelections(selections);
    }
  };

  /** Hides wrapper lines. */
  const hideWrapperLines = () => {
    (
      editor as monaco.editor.IStandaloneCodeEditor & {
        setHiddenAreas(ranges: monaco.Range[]);
      }
    ).setHiddenAreas([
      getRange(model, 1, Math.max(1, getStartLineNumber() - 1)),
      getRange(
        model,
        Math.min(model.getLineCount(), getEndLineNumber() + 1),
        model.getLineCount()
      ),
    ]);
  };
  hideWrapperLines();

  const actions: MonacoEditorActions = {
    getUserValue: () => {
      const startLineNumber = getStartLineNumber();
      const endLineNumber = getEndLineNumber();
      return model.getValueInRange(
        getRange(model, startLineNumber, endLineNumber)
      );
    },
    replaceUserValue: (value) => {
      replaceUserValue(wrapJsCode(value).code);
    },
    resetUserValue: (value) => {
      model.setValue(wrapJsCode(value).code);
    },
  };

  // Turns out the Delete and Backspace keys do not produce a keyboard event but commands
  // These commands overlay the default ones, thus cancelling the default behaviour
  // @see https://github.com/microsoft/monaco-editor/issues/940
  editor.addCommand(monaco.KeyCode.Backspace, noopFn, "startOfEditable");
  allModCombosOf(monaco.KeyCode.Backspace).forEach((modKey) =>
    editor.addCommand(modKey, noopFn, "startOfEditable")
  );
  editor.addCommand(monaco.KeyCode.Delete, noopFn, "endOfEditable");
  allModCombosOf(monaco.KeyCode.Delete).forEach((modKey) =>
    editor.addCommand(modKey, noopFn, "endOfEditable")
  );
  // MacOS: Delete
  editor.addCommand(
    monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyD,
    noopFn,
    "endOfEditable"
  );
  // MacOS: Delete Line
  editor.addCommand(
    monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyK,
    noopFn,
    "endOfEditable"
  );
  // MacOS: Transpose
  editor.addCommand(
    monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyT,
    noopFn,
    "startOfEditable"
  );
  editor.addCommand(
    monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyT,
    noopFn,
    "endOfEditable"
  );

  // These cheat on the replace widget so that it cannot replace anything in the wrapper.
  // Done by temporarily switching to "replace in selection" mode and back.
  // Atomic replacements "work as expected" without this, for some reason or another.
  const find = editor.getContribution("editor.contrib.findController") as any;
  const oldReplaceAll = find.replaceAll.bind(find);
  find.replaceAll = function replaceAll() {
    const oldSelections = editor.getSelections()
      ? [...(editor.getSelections() ?? [])]
      : [];
    const oldSearchScope = find._state.searchScope;
    const oldGetFindScope = find._model._decorations.getFindScope;
    if (!oldSearchScope) {
      // Make up a new replacement scope
      const startLineNumber = getStartLineNumber();
      const endLineNumber = getEndLineNumber();
      const endLineMaxColumn = model.getLineMaxColumn(endLineNumber);
      const scope = {
        endColumn: endLineMaxColumn,
        endLineNumber: endLineNumber,
        positionColumn: 1,
        positionLineNumber: startLineNumber,
        selectionStartColumn: endLineMaxColumn,
        selectionStartLineNumber: endLineNumber,
        startColumn: 1,
        startLineNumber: startLineNumber,
      };
      find._state.change(
        {
          searchScope: [
            {
              ...scope,
            },
          ],
        },
        true
      );
      editor.setSelection(scope);
      find._model._decorations.getFindScope = function getFindScope() {
        return scope;
      };
    }

    oldReplaceAll();

    // Bring the previous editor state back
    find._model._decorations.getFindScope = oldGetFindScope;
    editor.setSelections(oldSelections);
    find._state.change(
      {
        searchScope: oldSearchScope,
      },
      true
    );
    find._widget._updateSearchScope();
    restrictSelections(null);
  };

  editor.onDidChangeModelContent(() => {
    const value = model.getValue();

    if (!isValidJavaScriptCode(value)) {
      const { code, isValid } = wrapJsCode(actions.getUserValue());
      if (isValid) {
        replaceUserValue(code);
      }
    }

    // If the content causes the selection to now be at the start/end of the editable region,
    // we need to update `contextSOR` and `contextEOR`.
    restrictSelections(editor.getSelections());

    // If the line count changes, the new wrapper line must be hidden.
    hideWrapperLines();
  });

  editor.onDidChangeCursorSelection((evt) => {
    // Clamp selections so they can't select wrapper lines
    const selections = [evt.selection, ...evt.secondarySelections];
    restrictSelections(selections);
  });

  return actions;
}

export function upsertMonacoModel(
  filePath: string,
  language: string,
  content: string
): monaco.editor.ITextModel {
  const uri = monaco.Uri.parse(filePath);
  const existing = monaco.editor
    .getModels()
    .find((m) => m.uri.toString() === uri.toString());
  if (existing) {
    if (existing.getValue() !== content) {
      existing.setValue(content);
    }
    return existing;
  } else {
    return monaco.editor.createModel(content, language, uri);
  }
}

export function upsertMonacoExtraLib(
  lang: monaco.languages.typescript.LanguageServiceDefaults,
  filePath: string,
  content: string
): monaco.IDisposable | null {
  const existingLib = lang.getExtraLibs()[filePath];
  if (existingLib && existingLib.content === content) {
    return null;
  } else {
    return lang.addExtraLib(content, filePath);
  }
}

export function createFilePathWithExtension(
  fileName: string,
  language: string
) {
  return language === "typescript"
    ? `file:///${fileName}.tsx`
    : language === "json"
    ? `file:///${fileName}.json`
    : language === "html"
    ? `file:///${fileName}.html`
    : language === "css"
    ? `file:///${fileName}.css`
    : language === "javascript"
    ? `file:///${fileName}.jsx`
    : `file:///${fileName}.txt`;
}

const PREFIX_NEWLINES = "\n";
const PREFIX_LINE_COUNT = PREFIX_NEWLINES.length;
const SUFFIX_NEWLINES = "\n";
const SUFFIX_LINE_COUNT = SUFFIX_NEWLINES.length;

const EXPR_PREFIX = "(";
const EXPR_SUFFIX = ")";
const IIFE_PREFIX = "(() => {";
const IIFE_SUFFIX = "})()";

/**
 * Wraps code with exactly one line above and below, which will be hidden,
 * while attempting to make it valid code for a top-level statement.
 */
function wrapJsCode(code: string) {
  const blankWrappedCode = PREFIX_NEWLINES + code + SUFFIX_NEWLINES;

  const codeAsExpr = EXPR_PREFIX + blankWrappedCode + EXPR_SUFFIX;
  if (isValidJavaScriptCode(codeAsExpr)) {
    return { code: codeAsExpr, isValid: true };
  }

  const codeAsIife = IIFE_PREFIX + blankWrappedCode + IIFE_SUFFIX;
  if (isValidJavaScriptCode(codeAsIife)) {
    return { code: codeAsIife, isValid: true };
  }

  return { code: blankWrappedCode, isValid: false };
}

/**
 * Creates a function for a given editor and model that
 * replaces an editor's value without resetting editor state (e.g. undo stack).
 */
function replaceUserValueFn(
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel
) {
  return (value) => {
    editor.executeEdits(
      "replaceUserValue",
      [
        {
          range: model.getFullModelRange(),
          text: value,
        },
      ],
      editor.getSelections() ?? undefined // restore current selections after edit
    );
  };
}

function isRangeSelection(s: monaco.Selection) {
  return (
    s.selectionStartLineNumber !== s.positionLineNumber ||
    s.selectionStartColumn !== s.positionColumn
  );
}

function getRange(
  model: monaco.editor.ITextModel,
  startLineNumber: number,
  endLineNumber: number
): monaco.Range {
  return new monaco.Range(
    startLineNumber,
    1,
    endLineNumber,
    model.getLineMaxColumn(endLineNumber)
  );
}

function allModCombosOf(key: monaco.KeyCode) {
  return allModCombos.map((mod) => key | mod);
}

const allModCombos = [
  monaco.KeyMod.Alt,
  monaco.KeyMod.CtrlCmd,
  monaco.KeyMod.Shift,
  monaco.KeyMod.WinCtrl,

  monaco.KeyMod.Alt | monaco.KeyMod.CtrlCmd,
  monaco.KeyMod.Alt | monaco.KeyMod.Shift,
  monaco.KeyMod.Alt | monaco.KeyMod.WinCtrl,
  monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift,
  monaco.KeyMod.CtrlCmd | monaco.KeyMod.WinCtrl,
  monaco.KeyMod.Shift | monaco.KeyMod.WinCtrl,

  monaco.KeyMod.Alt | monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift,
  monaco.KeyMod.Alt | monaco.KeyMod.CtrlCmd | monaco.KeyMod.WinCtrl,
  monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyMod.WinCtrl,
  monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyMod.WinCtrl,

  monaco.KeyMod.Alt |
    monaco.KeyMod.CtrlCmd |
    monaco.KeyMod.Shift |
    monaco.KeyMod.WinCtrl,
];

/**
 * From
 * <https://github.com/Microsoft/monaco-editor/issues/115>.
 * onDidCreateEditor doesn't work.
 */
export function makeMonacoAutoFocus(
  codeEditor: monaco.editor.IStandaloneCodeEditor
) {
  let didScrollChangeDisposable;
  codeEditor.focus();
  didScrollChangeDisposable = codeEditor.onDidScrollChange((event) => {
    didScrollChangeDisposable.dispose();
    codeEditor.focus();
  });
}
