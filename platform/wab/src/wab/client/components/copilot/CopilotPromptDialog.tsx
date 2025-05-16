import CopilotMsg from "@/wab/client/components/CopilotMsg";
import {
  DefaultCopilotPromptDialogProps,
  PlasmicCopilotPromptDialog,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotPromptDialog";
import {
  ensure,
  isPrimitive,
  last,
  swallow,
  unexpected,
  withoutNils,
} from "@/wab/shared/common";
import { Popover, Tooltip } from "antd";
import * as React from "react";
import { FocusScope } from "react-aria";

import { CopilotPromptImage } from "@/wab/client/components/copilot/CopilotPromptImage";
import { dataPickerShouldHideKey } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import { ImageUploader } from "@/wab/client/components/style-controls/ImageSelector";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import ImageUploadsIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ImageUploads";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { trackEvent } from "@/wab/client/tracking";
import {
  CopilotImage,
  CopilotImageType,
  copilotImageTypes,
  CopilotResponseData,
} from "@/wab/shared/ApiSchema";
import { asDataUrl, parseDataUrl } from "@/wab/shared/data-urls";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import { isString, range } from "lodash";
import defer = setTimeout;

export interface CopilotPromptDialogProps
  extends DefaultCopilotPromptDialogProps {
  data?: any;
  currentValue?: string;
  onUpdate: (newValue: string) => void;
  // A brief description of what the expression is supposed to be used for
  context?: string;
  // Only set when `isSql` is true
  dataSourceSchema?: DataSourceSchema;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}

function CopilotPromptDialog_({
  onUpdate,
  currentValue,
  data,
  context,
  type,
  dataSourceSchema,
  className,
  dialogOpen,
  onDialogOpenChange,
  showImageUpload,
}: CopilotPromptDialogProps) {
  const [prompt, setPrompt] = React.useState("");
  const [submittedPrompt, setSubmittedPrompt] = React.useState("");
  const [showHistory, setShowHistory] = React.useState(false);
  const [images, setImages] = React.useState<CopilotImage[]>([]);
  const promptInputRef: React.Ref<TextboxRef> = React.useRef<TextboxRef>(null);
  const applyBtnRef: React.Ref<HTMLDivElement> =
    React.useRef<HTMLDivElement>(null);
  const studioCtx = useStudioCtx();
  const historyType = type === "sql" ? "sql" : "custom-code";

  const copilotResponse = useAsyncStrict(async () => {
    if (!submittedPrompt) {
      // Prompt not ready yet
      return undefined;
    }

    try {
      const result = await studioCtx.appCtx.api
        .queryCopilot({
          ...(type === "sql"
            ? {
                type: "code-sql",
                schema: ensure(dataSourceSchema, () => `Missing schema`),
                currentCode: processCurrentCode(currentValue),
                data: processData(data),
              }
            : type === "ui"
            ? {
                type: "ui",
                context,
                images,
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

      const resultCode = result.data.choices[0]?.message?.content || undefined;

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
    <PlasmicCopilotPromptDialog
      className={className}
      type={type}
      showImageUpload={showImageUpload}
      imageUploadIcon={{
        render: () => {
          return (
            <ImageUploader
              onUploaded={async (image, _file) => {
                const dataUrl = parseDataUrl(image.url);
                setImages((prev) => [
                  ...prev,
                  {
                    type: dataUrl.mediaType.split("/")[1] as CopilotImageType,
                    base64: dataUrl.data,
                  },
                ]);
              }}
              accept={copilotImageTypes.map((t) => `.${t}`).join(",")}
              isDisabled={false}
            >
              <div className="flex dimfg p-sm">
                <ImageUploadsIcon />
              </div>
            </ImageUploader>
          );
        },
      }}
      imageUploadContainer={{
        wrapChildren: () => {
          return images.map((image) => (
            <CopilotPromptImage
              img={{
                src: asDataUrl(image.base64, `image/${image.type}`, "base64"),
              }}
              closeIconContainer={{
                onClick: () => {
                  setImages((prev) =>
                    prev.filter((img) => img.base64 !== image.base64)
                  );
                },
              }}
            />
          ));
        },
      }}
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
            placement={type === "ui" ? "top" : "leftTop"}
            onOpenChange={(visible) => {
              if (!visible) {
                onDialogOpenChange?.(false);
              }
            }}
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
          onDialogOpenChange?.(false);
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
                    onDialogOpenChange?.(false);
                    setShowHistory(false);
                  },
                  onKeyPress: (e) => {
                    if (e.key === "Enter") {
                      onUpdate(historyResponse);
                      onDialogOpenChange?.(false);
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
      {...(dialogOpen
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
                              onDialogOpenChange?.(false);
                              setShowHistory(false);
                            },
                            onKeyPress: (e) => {
                              if (e.key === "Enter") {
                                onUpdate(ensure(newCode, "No message"));
                                onDialogOpenChange?.(false);
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

const CopilotPromptDialog = React.forwardRef(CopilotPromptDialog_);
export { CopilotPromptDialog };
