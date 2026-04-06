import {
  CodePreview,
  renderInspector,
} from "@/wab/client/components/coding/CodePreview";
import { DataInspector } from "@/wab/client/components/coding/DataInspector";
import type { FullCodeEditor } from "@/wab/client/components/coding/FullCodeEditor";
import {
  DataPickerRunCodeActionContext,
  DataPickerTypesSchema,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  DefaultDataPickerCodeEditorLayoutProps,
  PlasmicDataPickerCodeEditorLayout,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerCodeEditorLayout";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isLiteralObjectByName } from "@/wab/shared/common";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import L from "lodash";
import * as React from "react";

export interface DataPickerCodeEditorLayoutProps
  extends Omit<DefaultDataPickerCodeEditorLayoutProps, "envPanel"> {
  editorRef: React.RefObject<FullCodeEditor>;
  data: object;
  defaultValue: string;
  onSave: (val: string) => boolean;
  schema?: DataPickerTypesSchema;
  context?: string;
  hideEnvPanel?: boolean;
}

const LazyFullCodeEditor = React.lazy(
  () => import("@/wab/client/components/coding/FullCodeEditor")
);

function DataPickerCodeEditorLayout_(
  props: DataPickerCodeEditorLayoutProps,
  ref: HTMLElementRefOf<"div">
) {
  const {
    editorRef,
    data,
    defaultValue,
    onSave,
    schema,
    hideEnvPanel,
    context,
    ...rest
  } = props;
  const [currentValue, setCurrentValue] = React.useState(defaultValue);
  const [codeEditorKey, setCodeEditorKey] = React.useState(0);
  const [showEnv, setShowEnv] = React.useState(false);
  const studioCtx = useStudioCtx();
  const runCodeContext = React.useContext(DataPickerRunCodeActionContext);

  const completionData = React.useMemo(() => cleanDataForPreview(data), [data]);

  return (
    <PlasmicDataPickerCodeEditorLayout
      root={{ ref }}
      {...rest}
      codeEditor={
        <React.Suspense fallback={<div />}>
          <LazyFullCodeEditor
            ref={editorRef}
            key={codeEditorKey}
            hideLineNumbers={true}
            language={"javascript"}
            defaultValue={defaultValue}
            data={completionData}
            onSave={onSave}
            onChange={(val: string) => setCurrentValue(val)}
            enableMinimap={false}
            hideGlobalSuggestions={true}
            folding={false}
            schema={schema}
            autoFocus
          />
        </React.Suspense>
      }
      copilotCodePrompt={{
        props: {
          data,
          currentValue,
          onUpdate: (v) => {
            setCurrentValue(v);
            onSave(v);
            setCodeEditorKey(codeEditorKey + 1);
          },
          context,
        },
      }}
      codePreview={
        !runCodeContext ? (
          <CodePreview
            viewCtx={studioCtx.focusedViewCtx()}
            value={`(${currentValue})`}
            data={data}
          />
        ) : (
          renderInspector(runCodeContext.stepValue)
        )
      }
      envPanel={
        hideEnvPanel || !studioCtx.appCtx.appConfig.envPanel
          ? "hidden"
          : !showEnv
          ? "collapsed"
          : undefined
      }
      env={<DataInspector data={completionData} editorRef={editorRef} />}
      envToggleButton={{
        onClick: () => setShowEnv(!showEnv),
      }}
    />
  );
}

function cleanDataForPreview(data: Record<string, any>): Record<string, any> {
  const cache = new Map<any, any>();

  const rec = (x: any): any => {
    if (!!x && isLiteralObjectByName(x)) {
      const cleanedX = cache.get(x);
      if (cleanedX) {
        return cleanedX;
      }

      const filtered = L.omitBy(x, (val, key) => {
        return (
          key.startsWith("__plasmic") ||
          key.startsWith("$dataTokens_") ||
          key === "dataTokensEnv" ||
          key === "registerInitFunc" ||
          key === "eagerInitializeStates" ||
          (key === "$queries" && L.isEmpty(val)) // $queries is deprecated, we only show it if there are any queries
        );
      });
      cache.set(x, filtered);
      Object.keys(filtered).forEach(
        (key) => (filtered[key] = rec(filtered[key]))
      );
      return filtered;
    }
    return x;
  };

  return rec(data);
}
export const _testonly = { cleanDataForPreview };

const DataPickerCodeEditorLayout = React.forwardRef(
  DataPickerCodeEditorLayout_
);
export default DataPickerCodeEditorLayout;
