import { CodePreviewCtx } from "@/wab/client/components/docs/CodePreviewSnippet";
import { DocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import {
  makePlumeDepsImports,
  serializeDependentModules,
  serializeToggledComponent,
  serializeToggledIcon,
} from "@/wab/client/components/docs/serialize-docs-preview";
import { fixWorkerUrl } from "@/wab/client/monaco-worker-url";
import {
  makeAssetClassName,
  makeIconAssetFileNameWithoutExt,
} from "@/wab/shared/codegen/image-assets";
import {
  getExportedComponentName,
  makePlasmicComponentName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { ensure } from "@/wab/shared/common";
import {
  isCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import L from "lodash";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import React from "react";
import MonacoEditor from "react-monaco-editor";

// @ts-expect-error: Importing raw @plasmicapp/react-web types as a string
import REACT_WEB_TYPES from "!raw-loader!../../../../../node_modules/@plasmicapp/react-web/dist/all.d.ts";
// We need to install some typing information into our Monaco editor to
// support typing <Plasmic*/> components.  We cheat a bit here by just
// loading the relevant types directly from our own node_modules :-p
// @ts-expect-error: Importing raw react types as a string
import REACT_TYPES from "!raw-loader!../../../../../node_modules/@types/react/index.d.ts";

type MonacoType = typeof monacoEditor;

export const DocsPortalEditor = observer(function DocsPortalEditor(props: {
  docsCtx: DocsPortalCtx;
  codePreviewCtx?: CodePreviewCtx;
}) {
  const { docsCtx, codePreviewCtx } = props;
  const component = docsCtx.tryGetFocusedComponent();
  const icon = docsCtx.tryGetFocusedIcon();
  const [{ monaco, editor }, setMonaco] = React.useState<{
    monaco?: MonacoType;
    editor?: monacoEditor.editor.IStandaloneCodeEditor;
  }>({ monaco: undefined, editor: undefined });

  fixWorkerUrl();

  React.useEffect(() => {
    // This effect is run whenever component/icon changes (monaco and editor
    // should always stay the same)
    if ((!component && !icon) || !monaco || !editor) {
      return;
    }

    // If there's no model for the component/icon we're targeting yet,
    // create one
    const targetUri = monaco.Uri.parse(
      `file:///script_${component?.uuid || icon?.uuid}_${
        codePreviewCtx?.uuid
      }.tsx`
    );
    const model = upsertModel(monaco, targetUri, "");
    if (editor.getModel() !== model) {
      editor.setModel(model);

      // Everytime we switch to a different model, we need to ask the
      // editor to hide injected Plasmic imports
      hideInjectedCode(editor);
    }

    // Whenver the model content changes, we inform docsCtx about it
    const disposeModel = model.onDidChangeContent((event) => {
      const newCode = removeInjectedCode(model.getValue());

      if (codePreviewCtx) {
        codePreviewCtx.setCode(newCode);
        return;
      }

      if (component) {
        docsCtx.setComponentCustomCode(component, newCode);
      } else {
        docsCtx.setIconCustomCode(ensure(icon, "picked icon"), newCode);
      }
    });

    const dispose = autorun(
      () => {
        // This function is in a mobx autorun, so it'll be called whenever
        // observables change.  Specifically, whenever the dependent
        // Component / TplNodes / etc. change, and whenever the component/icon
        // toggles change.

        // First, re-generate the dependent code modules, in case they have
        // changed
        const { modules } = serializeDependentModules(docsCtx);
        for (const dep of modules) {
          if (dep.lang === "tsx") {
            const depUri = monaco.Uri.parse(
              `file:///${ensure(dep.name, "has name")}`
            );
            upsertModel(monaco, depUri, dep.source);
          }
        }

        // We need to inject some definitions so that the model file will
        // typecheck correctly.  See injection comment at the end of this file.
        const componentOrIconName =
          component &&
          (isPlumeComponent(component) || isCodeComponent(component))
            ? getExportedComponentName(component)
            : component
            ? makePlasmicComponentName(component)
            : makeAssetClassName(ensure(icon, "picked icon"));
        const injectedCode = markInjectedCode(`
import React from "react";
import ${componentOrIconName} from "./${
          component
            ? componentOrIconName
            : makeIconAssetFileNameWithoutExt(ensure(icon, "picked icon"))
        }";
${component ? makePlumeDepsImports(docsCtx.studioCtx.site, component) : ""}
        `);

        const docsCtxCode = component
          ? docsCtx.getComponentCustomCode(component) ??
            "// Try directly editing this code to pass in different props and overrides\n" +
              serializeToggledComponent(
                component,
                docsCtx.getComponentToggles(component),
                docsCtx.useLoader()
              )
          : docsCtx.getIconCustomCode(ensure(icon, "picked icon")) ??
            "// Try directly editing this code to pass in different props\n" +
              serializeToggledIcon(
                ensure(icon, "picked icon"),
                docsCtx.getIconToggles(ensure(icon, "picked icon")),
                docsCtx.useLoader()
              );

        const code = `
${injectedCode}
${codePreviewCtx?.getCode() ?? docsCtxCode}
`.trim();
        if (model.getValue() !== code) {
          model.setValue(code);
          hideInjectedCode(editor);
        }
      },
      { name: "DocsPortalEditor" }
    );

    return () => {
      dispose();
      disposeModel.dispose();
    };
  }, [component, icon, docsCtx, codePreviewCtx, monaco, editor]);

  if (!component && !icon) {
    return null;
  }

  return (
    <MonacoEditor
      options={{
        folding: false,
        fontSize: 12,
        glyphMargin: false,
        language: "typescript",
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        lineNumbers: "off",
        minimap: { enabled: false },
        tabSize: 2,
        theme: "vs-dark",
        useTabStops: false,

        // automaticLayout means the editor will resize when the available
        // space changes
        automaticLayout: true,
      }}
      width="100%"
      height="100%"
      editorDidMount={(editor_, monaco_) => {
        // set state to trigger re-render
        setMonaco({ editor: editor_, monaco: monaco_ });
      }}
      editorWillMount={(monaco_) => {
        // Upon initialization, set up monaco configurations to make sure
        // typechecking works as expected

        monaco_.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco_.languages.typescript.ScriptTarget.Latest,
          allowNonTsExtensions: true,
          moduleResolution:
            monaco_.languages.typescript.ModuleResolutionKind.NodeJs,
          module: monaco_.languages.typescript.ModuleKind.CommonJS,
          noEmit: true,
          esModuleInterop: true,
          jsx: monaco_.languages.typescript.JsxEmit.React,
          reactNamespace: "React",
          allowJs: true,
          typeRoots: ["node_modules/@types"],
        });
        monaco_.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
        });
        // Makes sure content changes in dependent files are reflected immediately
        monaco_.languages.typescript.typescriptDefaults.setEagerModelSync(true);

        // We add typing information as libraries for react and @plasmicapp/react-web,
        // which are the minimum necessary for typing to work when working with
        // Plasmic* components.
        // See https://github.com/microsoft/monaco-editor/issues/264#issuecomment-654578687
        monaco_.languages.typescript.typescriptDefaults.addExtraLib(
          REACT_TYPES,
          `file:///node_modules/@types/react/index.d.ts`
        );
        monaco_.languages.typescript.typescriptDefaults.addExtraLib(
          REACT_WEB_TYPES,
          `file:///node_modules/@plasmicapp/react-web/index.d.ts`
        );
        monaco_.languages.typescript.typescriptDefaults.addExtraLib(
          `function PlasmicComponent(props: {component: string, componentProps?: Record<string, any>}) {
            return <div />;
          }`
        );
      }}
    />
  );
});

/**
 * Finds an existing Model for the argument `uri`, and if none exists,
 * creates one.  In either case, makes sure the model content is `content`.
 */
function upsertModel(
  monaco: MonacoType,
  uri: monacoEditor.Uri,
  content: string
) {
  const existing = monaco.editor
    .getModels()
    .find((m) => m.uri.toString() === uri.toString());
  if (existing) {
    if (existing.getValue() !== content) {
      existing.setValue(content);
    }
    return existing;
  } else {
    const model = monaco.editor.createModel(content, "typescript", uri);
    return model;
  }
}

/*
 * "Injected" code
 *
 * We only want the user the be editing just the relevant code --
 * the <Plasmic* /> instantiation.  However, this code snippet
 * is incomplete -- for example, Plasmic* is an undefined identifier --
 * so you'd typically need to also `import PlasmicX from "./PlasmicX"`,
 * etc.  We don't want to show the import noise to the user, but monaco
 * works by file, and requires us to add the imports to that file.  To
 * accomplish this, we:
 *
 * - Mark all such "injected" code with a PLASMIC_INJECTED_IMPORT_MARKER
 * - Find and hide all such lines from the monaco editor, using an
 *   UNOFFICIAL and UNSUPPORTED API, editor.setHiddenAreans()
 * - We remove the injected code when we call
 *   docsPortalCtx.setComponentCustomCode() (or
 *   docsPortalCtx.setIconCustomCode()).
 */

const PLASMIC_INJECTED_IMPORT_MARKER = "// plasmic-monaco";

/**
 * Marks every line in this code snippet as injected
 */
function markInjectedCode(code: string) {
  return code
    .split("\n")
    .map((line) => `${line} ${PLASMIC_INJECTED_IMPORT_MARKER}`)
    .join("\n");
}

/**
 * Removes all lines in `code` marked as injected
 */
function removeInjectedCode(code: string) {
  return code
    .split("\n")
    .filter((line) => !line.endsWith(PLASMIC_INJECTED_IMPORT_MARKER))
    .join("\n");
}

/**
 * Finds lines marked as injected, and hides them from the monaco editor
 */
function hideInjectedCode(editor: monacoEditor.editor.IStandaloneCodeEditor) {
  const code = ensure(editor.getModel(), "has model").getValue();
  const lastIndex = L.findLastIndex(code.split("\n"), (line) =>
    line.trim().endsWith(PLASMIC_INJECTED_IMPORT_MARKER)
  );

  // We currently assume there's just a block of injected stuff in the
  // beginning of the file
  (editor as any).setHiddenAreas([
    { startLineNumber: 1, endLineNumber: lastIndex + 1 },
  ]);
}
