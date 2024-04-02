import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import PlasmicCopilotCodePrompt from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotCodePrompt";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { trackEvent } from "@/wab/client/tracking";
import {
  ensure,
  isPrimitive,
  last,
  swallow,
  unexpected,
  withoutNils,
} from "@/wab/common";
import { CopilotResponseData } from "@/wab/shared/ApiSchema";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import { Popover, Tooltip } from "antd";
import { isString, range } from "lodash";
import { observer } from "mobx-react";
import React from "react";
import { FocusScope } from "react-aria";
import CopilotMsg from "./CopilotMsg";
import { dataPickerShouldHideKey } from "./sidebar-tabs/DataBinding/DataPickerUtil";
import { TextboxRef } from "./widgets/Textbox";
import defer = setTimeout;

export interface CopilotCodePromptProps {
  data?: any;
  currentValue?: string;
  onUpdate: (newValue: string) => void;
  // A brief description of what the expression is supposed to be used for
  context?: string;
  isSql?: boolean;
  // Only set when `isSql` is true
  dataSourceSchema?: DataSourceSchema;
  className: string;
}

export const CopilotCodePrompt = observer(function CopilotCodePrompt({
  onUpdate,
  currentValue,
  data,
  context,
  isSql,
  dataSourceSchema,
  className,
}: CopilotCodePromptProps) {
  const [prompt, setPrompt] = React.useState("");
  const [submittedPrompt, setSubmittedPrompt] = React.useState("");
  const [openDialog, setOpenDialog] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const promptInputRef: React.Ref<TextboxRef> = React.useRef<TextboxRef>(null);
  const applyBtnRef: React.Ref<HTMLDivElement> =
    React.useRef<HTMLDivElement>(null);
  const studioCtx = useStudioCtx();
  const historyType = isSql ? "sql" : "custom-code";

  /*
  function executeRequest(request: CreateChatCompletionRequest) {
    console.log("#### request", request);
    return studioCtx.appCtx.api
      .queryCopilot({
        type: "debug",
        projectId: studioCtx.siteInfo.id,
        // This is the only real payload at the moment
        rawDebug: JSON.stringify(request),
        useClaude: studioCtx.appCtx.appConfig.copilotClaude,
      })
      .then((x) => {
        const res = JSON.parse(
          ensure(x.rawDebug, "")
        ) as CopilotResponseData;
        console.log("#### response ", x, res);
        return res;
      });
  }

  const copilotResponse = useAsyncStrict(async () => {
    if (!submittedPrompt) {
      // Prompt not ready yet
      return undefined;
    }
    if (false as boolean) {
      return "CopilotRateLimitExceededError";
    }
    return (await createAndRunCopilotSqlCodeChain({
      projectId: studioCtx.siteInfo.id,
      currentCode: processCurrentCode(currentValue),
      data: processData(data),
      dataSourceSchema: ensure(dataSourceSchema, ""),
      executeRequest,
      goal: prompt,
    })).composed;
  }, [submittedPrompt]);
  */

  const copilotResponse = useAsyncStrict(async () => {
    if (!submittedPrompt) {
      // Prompt not ready yet
      return undefined;
    }

    try {
      const result = await studioCtx.appCtx.api
        .queryCopilot({
          ...(!isSql
            ? { type: "code", context }
            : {
                type: "code-sql",
                schema: ensure(dataSourceSchema, () => `Missing schema`),
              }),
          projectId: studioCtx.siteInfo.id,
          currentCode: processCurrentCode(currentValue),
          data: processData(data),
          goal: prompt,
          ...(studioCtx.appCtx.appConfig.copilotClaude
            ? { useClaude: true }
            : {}),
        })
        .then((x) => {
          const res: CopilotResponseData = JSON.parse(x.response);
          return res;
        });

      const resultCode = result.data.choices[0]?.message?.content;

      if (resultCode) {
        studioCtx.addToCopilotHistory(historyType, {
          prompt: submittedPrompt,
          response: resultCode,
          id: result.copilotInteractionId,
        });
      }

      trackCopilotQuery({
        context,
        currentValue,
        data,
        prompt,
        result: resultCode,
      });

      return result;
    } catch (err) {
      if (err.name === "CopilotRateLimitExceededError") {
        return "CopilotRateLimitExceededError";
      }
      throw err;
    }
    // Intentionally not depending on anything bug the prompt to trigger the
    // request, so for example we don't keep issuing requests whenever the
    // `data` changes due to state updates in the canvas
  }, [submittedPrompt]);

  const newCode =
    copilotResponse.value !== "CopilotRateLimitExceededError"
      ? copilotResponse.value?.data?.choices[0].message?.content
      : undefined;

  React.useEffect(() => {
    defer(() => {
      if (newCode && applyBtnRef.current) {
        applyBtnRef.current.focus();
      }
    });
  }, [newCode]);

  const suggestionHistory = studioCtx.getCopilotHistory(historyType);

  return (
    <PlasmicCopilotCodePrompt
      className={className}
      promptContainer={{
        style: {
          zIndex: 1,
        },
      }}
      promptInput={{
        value: prompt,
        ref: promptInputRef,
        onChange: (e) => setPrompt(e.target.value),
        onKeyDown: (e) => {
          if (
            e.key === "Enter" &&
            prompt.trim() !== submittedPrompt &&
            !copilotResponse.loading
          ) {
            setSubmittedPrompt(prompt.trim());
            promptInputRef.current?.blur();
            applyBtnRef.current?.focus();
          }
        },
        autoFocus: true,
        maxLength: 500,
      }}
      history={{
        style: {
          fontSize: 16,
        },
      }}
      openCopilotBtn={{
        props: {
          onClick: () => setOpenDialog(true),
        },
        wrap: (elt) => (
          <Tooltip title={"Open Copilot"} mouseEnterDelay={0.5}>
            {elt}
          </Tooltip>
        ),
      }}
      runPromptBtn={{
        props: {
          onClick: () => setSubmittedPrompt(prompt.trim()),
          ...(prompt &&
          prompt.trim() !== submittedPrompt &&
          !copilotResponse.loading
            ? {}
            : { disabled: true }),
        },
        wrap: (elt) => (
          <Tooltip title={"Run Copilot"} mouseEnterDelay={0.5}>
            {elt}
          </Tooltip>
        ),
      }}
      popoverPlaceholder={{
        render: ({ children }) => (
          <Popover
            defaultOpen
            showArrow={false}
            placement="leftTop"
            onOpenChange={(visible) => !visible && setOpenDialog(false)}
            trigger="click"
            content={
              <FocusScope autoFocus contain>
                <div className="flex-col flex-vcenter flex-align-start pre copilot-no-background">
                  {children}
                </div>
              </FocusScope>
            }
            overlayClassName="copilot-no-background"
          >
            {
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "calc(100% - 40px)",
                  right: 0,
                  bottom: 0,
                  zIndex: 0,
                  margin: 0,
                }}
              ></div>
            }
          </Popover>
        ),
      }}
      cancelBtn={{
        onClick: () => {
          setShowHistory(false);
          setOpenDialog(false);
        },
        tooltip: "Close",
      }}
      historyBtn={{
        onClick: () => setShowHistory(!showHistory),
        tooltip: showHistory
          ? "Close suggestion history"
          : "Suggestion history",
      }}
      historyContents={{
        children: suggestionHistory.map(
          ({ prompt: historyPrompt, response: historyResponse, id }) => (
            <>
              <CopilotMsg userPrompt prompt={historyPrompt} />
              <CopilotMsg
                rightMargin
                code={historyResponse}
                key={id}
                copilotInteractionId={id}
                applyBtn={{
                  onClick: () => {
                    onUpdate(historyResponse);
                    setOpenDialog(false);
                    setShowHistory(false);
                  },
                  onKeyPress: (e) => {
                    if (e.key === "Enter") {
                      onUpdate(historyResponse);
                      setOpenDialog(false);
                      setShowHistory(false);
                    }
                  },
                }}
              />
            </>
          )
        ),
      }}
      promptDialog={{
        style: {
          // We copy the box shadow from antd to inside the sizer container
          boxShadow:
            "0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
        },
      }}
      {...(openDialog
        ? showHistory
          ? suggestionHistory.length > 0
            ? {
                state: "history",
              }
            : { state: "historyEmpty" }
          : copilotResponse.loading
          ? {
              state: "loading",
            }
          : copilotResponse.error !== undefined
          ? {
              state: "error",
            }
          : copilotResponse.value === "CopilotRateLimitExceededError"
          ? {
              state: "quotaExceeded",
            }
          : (() => {
              return {
                state: "ready",
                ...(newCode
                  ? {
                      reply: {
                        props: {
                          key: copilotResponse.value?.copilotInteractionId,
                          applyBtn: {
                            onClick: () => {
                              onUpdate(ensure(newCode, "No message"));
                              setOpenDialog(false);
                              setShowHistory(false);
                            },
                            onKeyPress: (e) => {
                              if (e.key === "Enter") {
                                onUpdate(ensure(newCode, "No message"));
                                setOpenDialog(false);
                                setShowHistory(false);
                              }
                            },
                            ref: applyBtnRef,
                          },
                          copilotInteractionId:
                            copilotResponse.value?.copilotInteractionId,
                          code: newCode,
                        },
                      },
                    }
                  : {
                      reply: {
                        render: () => null,
                      },
                    }),
              };
            })()
        : {})}
    />
  );
});

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

function processCurrentCode(currentCode: string | undefined) {
  // Max current code size
  const THRESHOLD = 3000;
  return currentCode && currentCode.length > THRESHOLD
    ? undefined
    : currentCode;
}

function trackCopilotQuery({
  prompt,
  context,
  currentValue,
  data,
  result,
}: {
  prompt: string;
  context: string | undefined;
  currentValue: string | undefined;
  data: any;
  result: string | undefined;
}) {
  const truncateCode = (code: string | undefined) =>
    code &&
    (code.length <= 500
      ? code
      : `${code.slice(0, 250)}\n// ...\n${code.slice(-250)}`);
  trackEvent("Run Copilot query", {
    prompt,
    context,
    currentCode: truncateCode(currentValue),
    env:
      data && typeof data === "object"
        ? JSON.stringify(
            Object.entries(data).map(([k, v]) =>
              k.startsWith("$") && v && typeof v === "object"
                ? [k, Object.keys(v)]
                : [k, typeof v]
            ),
            undefined,
            2
          )
        : undefined,
    result: truncateCode(result),
  });
}

export default CopilotCodePrompt;
