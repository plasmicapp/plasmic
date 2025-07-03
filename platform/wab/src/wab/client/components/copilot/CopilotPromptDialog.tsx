import CopilotMsg from "@/wab/client/components/CopilotMsg";
import {
  DefaultCopilotPromptDialogProps,
  PlasmicCopilotPromptDialog,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotPromptDialog";
import { Popover, Tooltip } from "antd";
import * as React from "react";
import { FocusScope } from "react-aria";

import { CopilotPromptImage } from "@/wab/client/components/copilot/CopilotPromptImage";
import {
  CopilotData,
  useCopilot,
} from "@/wab/client/components/copilot/useCopilot";
import { ImageUploader } from "@/wab/client/components/style-controls/ImageSelector";
import ImageUploadsIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ImageUploads";
import { isSubmitKeyCombo } from "@/wab/client/shortcuts/shortcut";
import { CopilotPrompt, CopilotType } from "@/wab/client/studio-ctx/StudioCtx";
import { CopilotImageType, copilotImageTypes } from "@/wab/shared/ApiSchema";
import { asDataUrl, parseDataUrl } from "@/wab/shared/data-urls";
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
  const [promptSubmitted, setPromptSubmitted] = React.useState(false);
  const [copilotPrompt, setCopilotPrompt] = React.useState<CopilotPrompt>({
    prompt: "",
    images: [],
  });

  const promptInputRef: React.Ref<HTMLTextAreaElement> =
    React.useRef<HTMLTextAreaElement>(null);
  const applyBtnRef: React.Ref<HTMLDivElement> =
    React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (dialogOpen && promptInputRef.current) {
      promptInputRef.current.focus();
    }
  }, [dialogOpen, promptInputRef.current]);

  const {
    response,
    displayMessage,
    suggestionHistory,
    copilotInteractionId,
    state,
  } = useCopilot<Response>({
    type,
    showHistory,
    promptSubmitted,
    copilotPrompt,
    onCopilotSubmit,
  });

  React.useEffect(() => {
    defer(() => {
      if (response && applyBtnRef.current) {
        applyBtnRef.current.focus();
      }
    });
  }, [response]);

  const isValidPrompt = copilotPrompt.prompt.trim() && state !== "loading";

  return (
    <PlasmicCopilotPromptDialog
      className={className}
      type={type}
      promptContainer={{
        style: {
          zIndex: 1,
        },
      }}
      promptInput={{
        imageUploadIcon: {
          render: () =>
            showImageUpload ? (
              <ImageUploader
                onUploaded={async (image, _file) => {
                  const dataUrl = parseDataUrl(image.url);
                  setCopilotPrompt((prev) => ({
                    ...prev,
                    images: [
                      ...prev.images,
                      {
                        type: dataUrl.mediaType.split(
                          "/"
                        )[1] as CopilotImageType,
                        base64: dataUrl.data,
                      },
                    ],
                  }));
                }}
                accept={copilotImageTypes.map((t) => `.${t}`).join(",")}
                isDisabled={false}
              >
                <div className="flex dimfg p-sm">
                  <ImageUploadsIcon />
                </div>
              </ImageUploader>
            ) : null,
        },
        imageUploadContainer: {
          wrapChildren: () => {
            return copilotPrompt.images.map((image) => (
              <CopilotPromptImage
                img={{
                  src: asDataUrl(image.base64, `image/${image.type}`, "base64"),
                }}
                closeIconContainer={{
                  onClick: () => {
                    setCopilotPrompt((prev) => ({
                      ...prev,
                      images: prev.images.filter(
                        (img) => img.base64 !== image.base64
                      ),
                    }));
                  },
                }}
              />
            ));
          },
        },
        runPromptBtn: {
          props: {
            onClick: () => setPromptSubmitted(true),
            disabled: !isValidPrompt,
          },
          wrap: (elt) => (
            <Tooltip title={"Run Copilot"} mouseEnterDelay={0.5}>
              {elt}
            </Tooltip>
          ),
        },
        showImageUpload,
        textAreaInput: {
          value: copilotPrompt.prompt,
          inputRef: promptInputRef,
          maxLength,
          rows: 1,
          autoFocus: true,
          onChange: (value) =>
            setCopilotPrompt({
              ...copilotPrompt,
              // onChange value is typed as string, but it's initially value triggered as undefined.
              prompt: value ?? "",
            }),
          onKeyDown: (e) => {
            if (isValidPrompt && isSubmitKeyCombo(e)) {
              e.preventDefault();
              setPromptSubmitted(true);
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
      popoverPlaceholder={{
        render: ({ children }) => (
          <Popover
            open={dialogOpen}
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
                  onClick: () => {
                    onCopilotApply(historyResponse);
                    onDialogOpenChange?.(false);
                    setShowHistory(false);
                  },
                  onKeyPress: (e) => {
                    if (e.key === "Enter") {
                      onCopilotApply(historyResponse);
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
                            onClick: () => {
                              onCopilotApply(response);
                              onDialogOpenChange?.(false);
                              setShowHistory(false);
                            },
                            onKeyPress: (e) => {
                              if (e.key === "Enter") {
                                onCopilotApply(response);
                                onDialogOpenChange?.(false);
                                setShowHistory(false);
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
