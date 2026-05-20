import { DataInspector } from "@/wab/client/components/coding/DataInspector";
import type { FullCodeEditor } from "@/wab/client/components/coding/FullCodeEditor";
import LazyFullCodeEditor from "@/wab/client/components/coding/LazyFullCodeEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { cleanDataForPreview } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerCodeEditorLayout";
import {
  DefaultDataQueryCodeEditorLayoutProps,
  PlasmicDataQueryCodeEditorLayout,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataQueryCodeEditorLayout";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getEnvForPlasmicQueries } from "@/wab/shared/core/custom-functions";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  transformDataTokensInCode,
  transformDataTokensToDisplay,
} from "@/wab/shared/eval/expression-parser";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface DataQueryCodeEditorLayoutProps
  extends Omit<
    DefaultDataQueryCodeEditorLayoutProps,
    "copilot" | "codeEditor" | "env"
  > {
  data: Record<string, any>;
  defaultValue: string;
  onChange: (val: string) => void;
  schema?: DataPickerTypesSchema;
  context?: string;
}

function DataQueryCodeEditorLayout_(
  props: DataQueryCodeEditorLayoutProps,
  ref: HTMLElementRefOf<"div">
) {
  const { data, defaultValue, onChange, schema, context, ...rest } = props;
  const studioCtx = useStudioCtx();
  const editorRef = React.useRef<FullCodeEditor>(null);
  const viewCtx = studioCtx.focusedViewCtx();
  const showCopilot = DEVFLAGS.showCopilot && !!viewCtx;

  // Convert stored flattened format ($dataTokens_projId_name) to editor display format
  // ($dataTokens.name) If the code is not parseable, fall back to the raw value.
  const displayValue = React.useMemo(() => {
    if (viewCtx) {
      try {
        return transformDataTokensToDisplay(
          defaultValue,
          viewCtx.site,
          studioCtx.siteInfo.id
        );
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }, [defaultValue, viewCtx, studioCtx.siteInfo.id]);

  const [currentValue, setCurrentValue] = React.useState(displayValue);
  const [codeEditorKey, setCodeEditorKey] = React.useState(0);

  const completionData = React.useMemo(
    () => getEnvForPlasmicQueries(cleanDataForPreview(data)),
    [data]
  );

  return (
    <PlasmicDataQueryCodeEditorLayout
      root={{ ref }}
      {...rest}
      copilot={showCopilot}
      copilotCodePrompt={{
        props: {
          data: completionData,
          currentValue,
          context,
          onUpdate: (v: string) => {
            setCurrentValue(v);
            onChange(v);
            setCodeEditorKey((k) => k + 1);
          },
        },
      }}
      codeEditor={
        <LazyFullCodeEditor
          ref={editorRef}
          key={codeEditorKey}
          hideLineNumbers={true}
          language="javascript"
          defaultValue={displayValue}
          data={completionData}
          onChange={(val: string) => {
            setCurrentValue(val);
            // While the user types, the code may have invalid syntax. Swallow parse errors
            // and pass the raw display value through.
            let transformed = val;
            if (viewCtx) {
              try {
                transformed = transformDataTokensInCode(
                  val,
                  viewCtx.site,
                  studioCtx.siteInfo.id
                );
              } catch {
                transformed = val;
              }
            }
            onChange(transformed);
          }}
          enableMinimap={false}
          hideGlobalSuggestions={true}
          folding={false}
          schema={schema}
          autoFocus
        />
      }
      env={<DataInspector data={completionData} editorRef={editorRef} />}
    />
  );
}

const DataQueryCodeEditorLayout = React.forwardRef(DataQueryCodeEditorLayout_);
export default DataQueryCodeEditorLayout;
