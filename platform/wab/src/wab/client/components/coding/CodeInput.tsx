import { fixWorkerUrl } from "@/wab/client/monaco-worker-url";
import { ensure, maybe, mkUuid } from "@/wab/shared/common";
import { dbg } from "@/wab/shared/dbg";
import { Size } from "@/wab/shared/geom";
import * as monaco from "monaco-editor";
import { editor } from "monaco-editor";
import React, { useEffect, useRef } from "react";
import { unstable_batchedUpdates } from "react-dom";
import MonacoEditor from "react-monaco-editor";

type IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
type IEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;
type IModelContentChangedEvent = editor.IModelContentChangedEvent;
type ICodeEditor = monaco.editor.ICodeEditor;

interface CodeInputProps {
  preamble: string;
  defaultCode: string;
  onReady?: (editor: ICodeEditor) => void;
  size?: Partial<Size>;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
  language?: string;
  overrideEnterKey?: boolean;
  submitOnBlur?: boolean;
}

/**
 * From
 * <https://github.com/Microsoft/monaco-editor/issues/115>.
 * onDidCreateEditor doesn't work.
 */
export function makeMonacoAutoFocus(codeEditor: IStandaloneCodeEditor) {
  let didScrollChangeDisposable;
  codeEditor.focus();
  didScrollChangeDisposable = codeEditor.onDidScrollChange((event) => {
    didScrollChangeDisposable.dispose();
    codeEditor.focus();
  });
}

/**
 * Problem: whenever hiding >=2 lines of code, backspacing into that region
 * throws "Not Supported" error from
 * InvisibleIdentitySplitLine.getModelColumnOfViewPosition().
 */
export function CodeInput({
  defaultCode,
  onChange,
  preamble,
  onReady,
  onSubmit,
  size: { width, height } = {},
  onCancel,
  language = "typescript",
  overrideEnterKey = false,
  submitOnBlur,
}: CodeInputProps) {
  const options: IEditorConstructionOptions = {
    language,
    theme: "vs-dark",
    lineNumbers: "off",
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    contextmenu: false,
    glyphMargin: false,
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    folding: false,
    scrollBeyondLastLine: false,
    wordWrap: "on",
    renderLineHighlight: "none",
    parameterHints: { enabled: true },
    scrollbar: {
      horizontal: "hidden",
      horizontalScrollbarSize: 0,
      vertical: "hidden",
      verticalScrollbarSize: 0,
    },
    minimap: {
      enabled: false,
    },
    // We set this to true so that overflow widgets (autocomplete menus,
    // function hints, etc.) will be rendered with `position: fixed` instead of
    // `position: absolute`. This means it can draw over containers that have
    // `overflow: hidden`, and will also not take up any space even when it's
    // not visible.
    fixedOverflowWidgets: true,
  };

  fixWorkerUrl();

  useEffect(() => {
    const extraLib = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      preamble,
      `env${mkUuid()}.d.ts`
    );
    return () => extraLib.dispose();
  }, [preamble]);

  const editorRef = useRef<IStandaloneCodeEditor>();

  function getEditor() {
    return ensure(editorRef.current, "Unexpected undefined editorRef");
  }

  function trySubmit() {
    if (onSubmit) {
      onSubmit(getEditor().getValue());
    }
  }

  function handleReady(codeEditor: IStandaloneCodeEditor) {
    dbg.editor = codeEditor;
    editorRef.current = codeEditor;

    codeEditor.onDidBlurEditorWidget(() => {
      if (submitOnBlur) {
        trySubmit();
      }
    });

    codeEditor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      trySubmit
    );
    codeEditor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      trySubmit
    );
    if (overrideEnterKey) {
      codeEditor.addCommand(monaco.KeyCode.Enter, trySubmit);
    }

    codeEditor.setSelection({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 99999,
      endColumn: 1,
    });

    makeMonacoAutoFocus(codeEditor);
    codeEditor.focus();
  }

  function handleChange(value: string, event: IModelContentChangedEvent) {
    if (onChange) {
      unstable_batchedUpdates(() => {
        onChange(value);
      });
    }
  }

  return (
    <div
      className={"pass-through"}
      onKeyDown={(e) => {
        // Monaco only stops propagating keys it handles. So if you have an autocomplete open and press Esc, then it'll close. Press again, and we'll fire onCancel.
        if (e.key === "Escape") {
          onCancel?.();
        }
      }}
    >
      <MonacoEditor
        defaultValue={defaultCode}
        language={options.language}
        options={options}
        onChange={handleChange}
        editorDidMount={handleReady}
        // We ask Monaco for more width, because Monaco puts some
        // invisible margin on the right and wraps text before hitting it :-/
        width={maybe(width, (w) => w + 10)}
        height={height}
      />
    </div>
  );
}

export default CodeInput;
