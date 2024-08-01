import {
  createFilePathWithExtension,
  makeMonacoAutoFocus,
  upsertMonacoExtraLib,
  upsertMonacoModel,
  useMonacoEditor,
} from "@/wab/client/components/coding/monacoEditorUtil";
import {
  DataPickerTypesSchema,
  extraTsFilesSymbol,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { isPlainObject, uniq } from "lodash";
import * as monaco from "monaco-editor";
import React from "react";

const BASE_FONT_FAMILY = '"Roboto Mono", Consolas, Menlo, monospace';
const BASE_FONT_SIZE = 12;

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
  folding?: boolean;
  schema?: DataPickerTypesSchema;
  /**
   * Defaults to true
   */
  autoFocus?: boolean;
}

export interface FullCodeEditor {
  getValue: () => string;
  /** Reset to the default value. */
  resetValue: () => void;
}

export const FullCodeEditor = React.forwardRef(
  (props: FullCodeEditorProps, ref: React.Ref<FullCodeEditor>) => {
    const {
      language = "typescript",
      defaultValue,
      data,
      enableMinimap = true,
      editorHeight,
      hideGlobalSuggestions,
      folding = true,
      schema,
      autoFocus = true,
    } = props;

    const handlersRef = React.useRef<
      Pick<FullCodeEditorProps, "onChange" | "onSave">
    >({
      onChange: props.onChange,
      onSave: props.onSave,
    });
    React.useLayoutEffect(() => {
      handlersRef.current = {
        onChange: props.onChange,
        onSave: props.onSave,
      };
    }, [props.onChange, props.onSave]);

    const options: monaco.editor.IStandaloneEditorConstructionOptions = {
      theme: "vs",
      folding: folding,
      stickyScroll: {
        enabled: false, // doesn't work well with hidden wrapper lines
      },
      lineNumbers: props.hideLineNumbers ? "off" : "on",
      minimap: { enabled: enableMinimap },
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      fontFamily: BASE_FONT_FAMILY,
      fontSize: BASE_FONT_SIZE,
      tabSize: 2,
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

    const [containerEl, setContainerEl] = React.useState<HTMLElement | null>(
      null
    );
    const editorActions = useMonacoEditor(containerEl, {
      modelFilePath: createFilePathWithExtension("main", language),
      modelLanguage: language,
      modelDefaultValue: defaultValue,
      editorOptions: options,
      onBeforeEditorCreate: function* () {
        // Add data as library so IntelliSense can use it for completions.
        if (data) {
          // Add extra libs for the correct language.
          const langDefaults =
            language === "javascript"
              ? monaco.languages.typescript.javascriptDefaults
              : monaco.languages.typescript.typescriptDefaults;

          // Not sure why dataLanguage is typescript if schema,
          // but it was introduced in this CR:
          // https://gerrit.aws.plasmic.app/c/plasmic/+/16651
          const dataLanguage =
            language === "javascript" && schema ? "typescript" : language;

          const dataCode = dataObjToCode(data, schema);
          const envUri = createFilePathWithExtension("env", dataLanguage);
          yield upsertMonacoExtraLib(langDefaults, envUri, dataCode);
          yield upsertMonacoModel(envUri, dataLanguage, dataCode);

          if (schema && schema[extraTsFilesSymbol]) {
            for (const { contents, fileName } of schema[extraTsFilesSymbol]) {
              const fullPath = `file:///${fileName.replace(/^\.\//, "")}`;
              yield upsertMonacoExtraLib(langDefaults, fullPath, contents);
            }
          }
        }
      },
      onAfterEditorCreate: function* (editor, actions) {
        yield editor.onDidChangeModelContent(() => {
          handlersRef.current.onChange?.(actions.getUserValue());
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
          handlersRef.current.onSave?.(actions.getUserValue())
        );
        if (autoFocus) {
          setTimeout(() => {
            makeMonacoAutoFocus(editor);
          }, 0);
        }
      },
    });

    React.useImperativeHandle(
      ref,
      () => ({
        getValue: () => editorActions?.getUserValue() ?? "",
        resetValue: () => editorActions?.resetUserValue(defaultValue),
      }),
      [editorActions]
    );

    return (
      <div
        ref={(el) => setContainerEl(el)}
        style={{ height: editorHeight || "100%", width: "100%" }}
        className="react-monaco-editor-container"
      />
    );
  }
);

function dataObjToCode(
  data: Record<string, any>,
  schema?: DataPickerTypesSchema
): string {
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
