import { CopilotPromptDialog } from "@/wab/client/components/copilot/CopilotPromptDialog";
import { dataPickerShouldHideKey } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import PlasmicCopilotCodePrompt from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotCodePrompt";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { CopilotResponseData } from "@/wab/shared/ApiSchema";
import {
  ensure,
  isPrimitive,
  last,
  swallow,
  unexpected,
  withoutNils,
} from "@/wab/shared/common";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import { Tooltip } from "antd";
import { isString, range } from "lodash";
import { observer } from "mobx-react";
import React from "react";

export interface CopilotCodePromptProps {
  data?: any;
  currentValue?: string;
  onUpdate: (newValue: string) => void;
  // A brief description of what the expression is supposed to be used for
  context?: string;
  type: "code" | "sql";
  // Only set when `isSql` is true
  dataSourceSchema?: DataSourceSchema;
  className: string;
}

export const CopilotCodePrompt = observer(function CopilotCodePrompt({
  onUpdate,
  currentValue,
  data,
  context,
  type,
  dataSourceSchema,
  className,
}: CopilotCodePromptProps) {
  const studioCtx = useStudioCtx();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <PlasmicCopilotCodePrompt
      className={className}
      openCopilotBtn={{
        props: {
          onClick: () => {
            setDialogOpen(true);
          },
        },
        wrap: (elt) => (
          <>
            <Tooltip title={"Open Copilot"} mouseEnterDelay={0.5}>
              {elt}
            </Tooltip>
            <CopilotPromptDialog<string>
              dialogOpen={dialogOpen}
              onDialogOpenChange={(open) => setDialogOpen(open)}
              onCopilotApply={onUpdate}
              type={type}
              maxLength={500}
              onCopilotSubmit={async ({ prompt }) => {
                const result = await studioCtx.appCtx.api
                  .queryCopilot({
                    ...(type === "sql"
                      ? {
                          type: "code-sql",
                          schema: ensure(
                            dataSourceSchema,
                            () => `Missing schema`
                          ),
                          currentCode: processCurrentCode(currentValue),
                          data: processData(data),
                        }
                      : {
                          type: "code",
                          context,
                          currentCode: processCurrentCode(currentValue),
                          data: processData(data),
                        }),
                    projectId: studioCtx.siteInfo.id,
                    goal: prompt,
                    ...(studioCtx.appCtx.appConfig.copilotClaude
                      ? { useClaude: true }
                      : {}),
                  })
                  .then((x) => {
                    const res: CopilotResponseData = JSON.parse(x.response);
                    return res;
                  });

                const response =
                  result.data.choices[0]?.message?.content ?? undefined;

                return {
                  response,
                  displayMessage: response,
                  copilotInteractionId: result.copilotInteractionId,
                  data,
                  currentValue,
                  context,
                };
              }}
            />
          </>
        ),
      }}
    />
  );
});

function processCurrentCode(currentCode: string | undefined) {
  // Max current code size
  const THRESHOLD = 3000;
  return currentCode && currentCode.length > THRESHOLD
    ? undefined
    : currentCode;
}

function processData(data: Record<string, any>) {
  const depthRange = range(7, 2, -1);
  for (const maxDepth of depthRange) {
    const rec = (v: any, depth: number, path: (string | number)[]) => {
      if (isPrimitive(v)) {
        if (isString(v) && v.length > 25) {
          return `${v.slice(0, 20)}...`;
        }
        return v;
      }
      if (depth > maxDepth) {
        return Array.isArray(v) ? [] : {};
      }
      if (Array.isArray(v)) {
        return (v.length > 3 ? [...v.slice(0, 3), "... (long array"] : v).map(
          (val, i) => rec(val, depth + 1, [...path, i])
        );
      } else {
        return Object.fromEntries(
          withoutNils(
            Object.keys(v).map((key) =>
              swallow(() =>
                typeof v[key] === "function" ||
                dataPickerShouldHideKey(key, v, path, {
                  showAdvancedFields: true,
                })
                  ? null
                  : ([key, rec(v[key], depth + 1, [...path, key])] as const)
              )
            )
          ).slice(0, 50)
        );
      }
    };
    const res = rec(data, 1, []);
    // Max data size
    const THRESHOLD = 2500;
    if (
      (JSON.stringify(res)?.length ?? 0) <= THRESHOLD ||
      maxDepth === last(depthRange)
    ) {
      return res;
    }
  }
  unexpected();
}
