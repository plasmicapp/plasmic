import {
  DataPickerTypesSchema,
  extraTsFilesSymbol,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { fixWorkerUrl } from "@/wab/client/monaco-worker-url";
import { isValidJavaScriptCode } from "@/wab/shared/parser-utils";
import { isPlainObject, uniq } from "lodash";
import * as monaco from "monaco-editor";
import React, { useEffect } from "react";
import MonacoEditor from "react-monaco-editor";
import { makeMonacoAutoFocus } from "./CodeInput";
import {
  IAdvancedStandaloneCodeEditor,
  IEditorConstructionOptions,
  IStandaloneCodeEditor,
  setUpWrappers,
} from "./monacoEditorUtil";

// @ts-expect-error: Importing raw react types as a string
// eslint-disable-next-line path/no-relative-imports
import REACT_TYPES_RAW from "!raw-loader!../../../../../node_modules/@types/react/index.d.ts";
// @ts-expect-error: Importing raw react types as a string
// eslint-disable-next-line path/no-relative-imports
import GLOBAL_TYPES_RAW from "!raw-loader!../../../../../node_modules/@types/react/global.d.ts";

const BASE_FONT_FAMILY = '"Roboto Mono", Consolas, Menlo, monospace';
const BASE_FONT_SIZE = 12;

const REACT_TYPES: string = REACT_TYPES_RAW as any;
const GLOBAL_TYPES: string = GLOBAL_TYPES_RAW as any;

export interface FullCodeEditorProps {
  language?: string;
  defaultValue: string;
  /**
   * Called if the user explicitly triggers the save shortcut, ctrl+s
   */
  onSave?: (val: string) => void;
  onChange?: (val: string) => void;
  data?: Record<string, any>;
  hideLineNumbers?: boolean;
  enableMinimap?: boolean;
  editorHeight?: number;
  hideGlobalSuggestions?: boolean;
  lightTheme?: boolean;
  folding?: boolean;
  schema?: DataPickerTypesSchema;
  showReactNamespace?: boolean;
  /**
   * Defaults to true
   */
  autoFocus?: boolean;
}
export interface FullCodeEditor {
  getValue: () => string;
}

const EXPR_PREFIX = "(\n";
const EXPR_SUFFIX = "\n)";
const IIFE_PREFIX = "(() => {\n";
const IIFE_SUFFIX = "\n})()";

function wrapJsCode(code: string, mode: "expr" | "iife") {
  return mode === "expr"
    ? `${EXPR_PREFIX}${code}${EXPR_SUFFIX}`
    : `${IIFE_PREFIX}${code}${IIFE_SUFFIX}`;
}

function maybeWrapJsCode(code: string, mode: "expr" | "iife") {
  const wrappedCode = wrapJsCode(code, mode);
  if (!isValidJavaScriptCode(wrappedCode)) {
    return undefined;
  }
  return wrappedCode;
}

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  // `moduleResolution` is needed for some import types to work, such as
  // `copy-to-clipboard` and `fast-stringify` libs
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  // Setting `lib` to `esnext` breaks types for `isomorphic-fetch` lib
  // lib: ["esnext"],
  allowNonTsExtensions: true,
  allowJs: true,
  noEmit: true,
});

export const FullCodeEditor = React.forwardRef(
  (props: FullCodeEditorProps, ref: React.Ref<FullCodeEditor>) => {
    const {
      language = "typescript",
      defaultValue,
      onSave,
      onChange,
      data,
      enableMinimap = true,
      editorHeight,
      hideGlobalSuggestions,
      lightTheme,
      folding = true,
      schema,
      showReactNamespace,
      autoFocus = true,
    } = props;

    const languageDefaults =
      language === "javascript" ? "javascriptDefaults" : "typescriptDefaults";

    fixWorkerUrl();

    const onChangeRef = React.useRef<FullCodeEditorProps["onChange"]>(onChange);
    React.useLayoutEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Monaco Editor internally stores a list of all created models. It is unclear
    // when they are destroyed. But Monacor Editor will throw an exception if the
    // model with the same URI is created multiple times.
    // TODO: derive the URI from current context
    if (data) {
      const dataCode = dataObjToCode(data, schema);
      const envLanguage =
        language === "javascript" && schema ? "typescript" : language;
      const envUri = createFilePathWithExtension("env", envLanguage);
      const libs = monaco.languages.typescript[languageDefaults].getExtraLibs();
      if (!libs[envUri] || libs[envUri].content !== dataCode) {
        monaco.languages.typescript[languageDefaults].addExtraLib(
          dataCode,
          envUri
        );
      }

      if (schema && schema[extraTsFilesSymbol]) {
        const newFiles = new Set<string>();
        for (const { contents, fileName } of schema[extraTsFilesSymbol]) {
          if (!libs[fileName] && !newFiles.has(fileName)) {
            const fullPath = `file:///${fileName.replace(/^\.\//, "")}`;
            monaco.languages.typescript[languageDefaults].addExtraLib(
              contents,
              fullPath
            );
            newFiles.add(fileName);
          }
        }
      }

      const parsedenvUri = monaco.Uri.parse(envUri);
      upsertModel(parsedenvUri, dataCode, envLanguage);
    }
    if (showReactNamespace) {
      monaco.languages.typescript[languageDefaults].addExtraLib(
        REACT_TYPES,
        `file:///node_modules/@types/react/index.d.ts`
      );
      monaco.languages.typescript[languageDefaults].addExtraLib(
        GLOBAL_TYPES,
        `file:///node_modules/@types/react/global.d.ts`
      );
    }

    const isJavascriptLanguage = (lang: string) =>
      lang === "typescript" || lang === "javascript";

    const wrappedDefaultValue = React.useMemo(() => {
      return isJavascriptLanguage(language)
        ? maybeWrapJsCode(defaultValue, "expr") ??
            maybeWrapJsCode(defaultValue, "iife") ??
            wrapJsCode(defaultValue, "expr")
        : defaultValue;
    }, [language, defaultValue]);

    React.useEffect(() => {
      const currentUri = monaco.Uri.parse(
        createFilePathWithExtension("main", language)
      );
      const model = upsertModel(currentUri, wrappedDefaultValue, language);
      editorRef.current?.setModel(model);

      const deriveCodeMode = () => {
        const value = model.getValue();
        return value.startsWith(EXPR_PREFIX) && value.endsWith(EXPR_SUFFIX)
          ? ("expr" as const)
          : value.startsWith(IIFE_PREFIX) && value.endsWith(IIFE_SUFFIX)
          ? ("iife" as const)
          : undefined;
      };

      const hideHiddenLines = () => {
        if (isJavascriptLanguage(language)) {
          const mode = deriveCodeMode();
          if (mode) {
            if (editorRef.current) {
              const lastLine = model.getLineCount();
              editorRef.current.setHiddenAreas([
                {
                  startLineNumber: 1,
                  endLineNumber: 1,
                },
                {
                  startLineNumber: lastLine,
                  endLineNumber: lastLine,
                },
              ]);
              const position = editorRef.current?.getPosition();
              if (
                position?.lineNumber === 1 ||
                position?.lineNumber === lastLine
              ) {
                editorRef.current?.setPosition({ lineNumber: 2, column: 1 });
              }
            }
          }
        }
      };
      hideHiddenLines();

      const dispose = model.onDidChangeContent(() => {
        const realValue = getRealValue();
        if (isJavascriptLanguage(language)) {
          const value = model.getValue();
          const mode = deriveCodeMode();
          if (mode) {
            if (!isValidJavaScriptCode(value)) {
              const newCode = maybeWrapJsCode(
                realValue,
                mode === "expr" ? "iife" : "expr"
              );
              if (newCode && editorRef.current) {
                model.setValue(newCode);
              }
            }
          }
        }
        hideHiddenLines();
        return onChangeRef.current?.(getRealValue());
      });
      return () => {
        dispose.dispose();
      };
    }, [wrappedDefaultValue, language]);

    const getRealValue = () => {
      const cur = editorRef.current?.getModel()?.getValue() ?? "";
      if (isJavascriptLanguage(language)) {
        const prefixSuffix: [string, string][] = [
          [EXPR_PREFIX, EXPR_SUFFIX],
          [IIFE_PREFIX, IIFE_SUFFIX],
        ];
        for (const [pref, suff] of prefixSuffix) {
          if (cur.startsWith(pref) && cur.endsWith(suff)) {
            return cur.slice(pref.length, -suff.length);
          }
        }
      }
      return cur;
    };

    const options: IEditorConstructionOptions = {
      language,
      theme: lightTheme ? "vs" : "vs-dark",
      folding: folding,
      lineNumbers: props.hideLineNumbers ? "off" : "on",
      minimap: { enabled: enableMinimap },
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      fontFamily: BASE_FONT_FAMILY,
      fontSize: BASE_FONT_SIZE,
      suggest: hideGlobalSuggestions
        ? {
            showConstructors: false,
            showModules: false,
            showEvents: false,
            showFiles: false,
            showFolders: false,
            showInterfaces: false,
            showValues: false,
            showStructs: false,
            showVariables: false,
            showReferences: false,
            showKeywords: false,
            showClasses: false,
          }
        : {},
    };

    useEffect(() => {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        ...(showReactNamespace ? { reactNamespace: "React" } : {}),
        jsx: monaco.languages.typescript.JsxEmit.React,
        target:
          language === "typescript"
            ? monaco.languages.typescript.ScriptTarget.ESNext
            : undefined,
      });
    }, []);

    React.useImperativeHandle(ref, () => ({
      getValue: () => getRealValue(),
    }));

    const editorRef = React.useRef<IAdvancedStandaloneCodeEditor>();

    function handleReady(editor: IStandaloneCodeEditor) {
      editorRef.current = editor as IAdvancedStandaloneCodeEditor;
      if (onSave) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
          onSave(getRealValue())
        );
      }
      if (isJavascriptLanguage(language)) {
        setUpWrappers(editor as IAdvancedStandaloneCodeEditor);
      }
      if (autoFocus) {
        setTimeout(() => {
          makeMonacoAutoFocus(editor);
        }, 0);
      }
    }

    return (
      <div style={{ height: "100%", width: "100%" }}>
        <div
          style={{
            height: editorHeight ?? "inherit",
          }}
        >
          <MonacoEditor
            options={options}
            // defaultValue={}
            editorDidMount={handleReady}
          />
        </div>
      </div>
    );
  }
);

function createFilePathWithExtension(fileName: string, language: string) {
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
    : `file://${fileName}.txt`;
}

function upsertModel(uri: monaco.Uri, content: string, language: string) {
  const existing = monaco.editor
    .getModels()
    .find((m) => m.uri.toString() === uri.toString());
  if (existing) {
    if (existing.getValue() !== content) {
      existing.setValue(content);
    }
    return existing;
  } else {
    const model = monaco.editor.createModel(content, language, uri);
    return model;
  }
}

function dataObjToCode(
  data: Record<string, any>,
  schema?: DataPickerTypesSchema
) {
  // If schema is given, make sure we also output type info for
  // schema keys, even if they don't exist in `data`
  const keys = uniq([
    ...Object.keys(data),
    ...(schema ? Object.keys(schema) : []),
  ]);
  return keys
    .map((key) => {
      const value = data[key];
      if (schema && key in schema) {
        return `declare const ${key}: ${schema[key]};`;
      } else {
        return `const ${key} = ${literalize(value)};`;
      }
    })
    .join("\n");
}

function literalize(value: any) {
  try {
    // We just JSON.stringify() the value, which should work for
    // most JSON data structures or simple classes. We make special
    // effort to detect React elements though, and literalize them as
    // just {}, because we do not want to end up walking the React
    // elements, which will involve walking their props, which will
    // lead to referencing all sorts of things like the Site model etc.
    return JSON.stringify(value, (_, val) => {
      if (typeof val === "object" && val?.$$typeof) {
        return {};
      } else if (typeof val === "function") {
        return val.toString();
      } else if (isPlainObject(val)) {
        const res = { ...val };
        for (const key of Object.keys(res)) {
          if (
            key.startsWith("__plasmic") ||
            // Exclude functions on $state that shouldn't be used by
            // the user
            ["registerInitFunc", "eagerInitializeStates"].includes(key)
          ) {
            delete res[key];
          }
        }
        return res;
      } else {
        return val !== undefined ? val : null;
      }
    });
  } catch {
    return JSON.stringify({});
  }
}

export default FullCodeEditor;
