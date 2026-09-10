import CopilotMsg from "@/wab/client/components/CopilotMsg";
import {
  DefaultCopilotPromptDialogProps,
  PlasmicCopilotPromptDialog,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotPromptDialog";
import { Tooltip, notification } from "antd";
import * as React from "react";
import { FocusScope } from "react-aria";

import { CopilotPromptImage } from "@/wab/client/components/copilot/CopilotPromptImage";
import {
  CopilotData,
  useCopilot,
} from "@/wab/client/components/copilot/useCopilot";
import { useCopilotImageUpload } from "@/wab/client/components/copilot/useCopilotImageUpload";
import { useAutoFocus } from "@/wab/client/hooks/useAutoFocus";
import { isSubmitKeyCombo } from "@/wab/client/shortcuts/shortcut";
import {
  CopilotPrompt,
  CopilotType,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import { asDataUrl } from "@/wab/shared/data-urls";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import cn from "classnames";
import defer = setTimeout;

export interface CopilotPromptDialogProps<Response>
  extends DefaultCopilotPromptDialogProps {
  type: CopilotType;
  maxLength?: number;
  showImageUpload?: boolean;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onCopilotSubmit: (args: CopilotPrompt) => Promise<CopilotData<Response>>;
  onCopilotApply: (newValue: Response) => void;
}

function CopilotPromptDialog<Response>({
  onCopilotApply,
  type,
  className,
  dialogOpen,
  onDialogOpenChange,
  showImageUpload,
  maxLength,
  onCopilotSubmit,
}: CopilotPromptDialogProps<Response>) {
  const [showHistory, setShowHistory] = React.useState(false);
  const [copilotPrompt, setCopilotPrompt] = React.useState<CopilotPrompt>({
    prompt: "",
    images: [],
    modelProviderOverride: "",
    copilotSystemPromptOverride: "",
  });
  const studioCtx = useStudioCtx();
  const appCtx = studioCtx.appCtx;

  const promptInputRef = React.useRef<HTMLTextAreaElement>(null);
  const applyBtnRef: React.Ref<HTMLDivElement> =
    React.useRef<HTMLDivElement>(null);

  useAutoFocus(dialogOpen && promptInputRef);

  const {
    response,
    displayMessage,
    suggestionHistory,
    copilotInteractionId,
    state,
    submitPrompt,
  } = useCopilot<Response>({
    type,
    showHistory,
    onCopilotSubmit,
  });

  const starterPrompt = studioCtx.copilotStarterPrompt;

  React.useEffect(() => {
    if (starterPrompt) {
      const newCopilotPrompt = {
        prompt: starterPrompt,
        images: [],
      };
      setCopilotPrompt(newCopilotPrompt);
      spawn(submitPrompt(newCopilotPrompt));
      studioCtx.app.showSpinner();
    }
  }, [starterPrompt]);

  React.useEffect(() => {
    defer(() => {
      if (response && applyBtnRef.current) {
        if (starterPrompt) {
          studioCtx.app.hideSpinner();
          applyResponse(response);
          studioCtx.copilotStarterPrompt = "";
        } else {
          applyBtnRef.current.focus();
        }
      }
    });
  }, [response]);

  const { fileInput, openFilePicker, isUploading } = useCopilotImageUpload({
    onUpload: (image) =>
      setCopilotPrompt((prev) => ({
        ...prev,
        images: [...prev.images, image],
      })),
    onUploadError: (file, uploadError) =>
      notification.error({
        message: `Error uploading ${file.name}`,
        description: uploadError.message,
      }),
  });

  const isValidPrompt =
    copilotPrompt.prompt.trim() && state !== "loading" && !isUploading;

  const applyResponse = (historyResponse: Response) => {
    onCopilotApply(historyResponse);
    onDialogOpenChange?.(false);
    setShowHistory(false);
  };

  return (
    <PlasmicCopilotPromptDialog
      type={type}
      promptInput={{
        withAdminOverrides:
          type === "ui" &&
          isAdminTeamEmail(appCtx.selfInfo?.email, appCtx.appConfig),
        modelOverrideInput: {
          onChange: (value) =>
            setCopilotPrompt({
              ...copilotPrompt,
              modelProviderOverride: value,
            }),
        },
        systemPromptInput: {
          onChange: (value) =>
            setCopilotPrompt({
              ...copilotPrompt,
              copilotSystemPromptOverride: value,
            }),
        },
        imageUploadIcon: showImageUpload
          ? {
              props: {
                tooltip: "Attach image",
                onClick: openFilePicker,
              },
              wrap: (button) => (
                <>
                  {button}
                  {fileInput}
                </>
              ),
            }
          : { render: () => null },
        imageUploadContainer: showImageUpload
          ? {
              wrapChildren: () =>
                copilotPrompt.images.map((image) => (
                  <CopilotPromptImage
                    key={image.base64}
                    img={{
                      src: asDataUrl(
                        image.base64,
                        `image/${image.type}`,
                        "base64"
                      ),
                    }}
                    onDelete={() =>
                      setCopilotPrompt((prev) => ({
                        ...prev,
                        images: prev.images.filter((img) => img !== image),
                      }))
                    }
                  />
                )),
            }
          : { render: () => null },
        runPromptBtn: {
          props: {
            onClick: () => submitPrompt(copilotPrompt),
            disabled: !isValidPrompt,
          },
          wrap: (elt) => (
            <Tooltip title={"Run Plasmic AI"} mouseEnterDelay={0.5}>
              {elt}
            </Tooltip>
          ),
        },
        textAreaInput: {
          value: copilotPrompt.prompt,
          maxLength,
          rows: 1,
          autoFocus: true,
          onChange: (e) =>
            setCopilotPrompt({
              ...copilotPrompt,
              prompt: e.target.value,
            }),
          onKeyDown: async (e) => {
            if (isValidPrompt && isSubmitKeyCombo(e)) {
              e.preventDefault();
              await submitPrompt(copilotPrompt);
              promptInputRef.current?.blur();
              applyBtnRef.current?.focus();
            }
          },
        },
      }}
      history={{
        style: {
          fontSize: 16,
        },
      }}
      rootContainer={{
        render: ({ className: rootClassname, children }) =>
          dialogOpen ? (
            <FocusScope autoFocus>
              <div className={cn(rootClassname, className)}>{children}</div>
            </FocusScope>
          ) : null,
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
          ({
            prompt: historyPrompt,
            response: historyResponse,
            displayMessage: historyDisplayMessage,
            id,
          }) => (
            <>
              <CopilotMsg userPrompt prompt={historyPrompt} />
              <CopilotMsg
                rightMargin
                code={historyDisplayMessage}
                key={id}
                copilotInteractionId={id}
                applyBtn={{
                  onClick: () => applyResponse(historyResponse),
                  onKeyPress: (e) => {
                    if (e.key === "Enter") {
                      applyResponse(historyResponse);
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
        ? state !== "ready"
          ? {
              state,
            }
          : (() => {
              return {
                state: "ready",
                ...(response
                  ? {
                      reply: {
                        props: {
                          key: copilotInteractionId,
                          applyBtn: {
                            onClick: () => applyResponse(response),
                            onKeyPress: (e) => {
                              if (e.key === "Enter") {
                                applyResponse(response);
                              }
                            },
                            ref: applyBtnRef,
                          },
                          copilotInteractionId: copilotInteractionId,
                          code: displayMessage,
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

export { CopilotPromptDialog };
