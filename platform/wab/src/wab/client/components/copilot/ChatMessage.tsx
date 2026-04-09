import { MessagePartPopoverContentBlock } from "@/wab/client/components/copilot/MessagePartPopoverContentBlock";
import { MessagePartWithPopover } from "@/wab/client/components/copilot/MessagePartWithPopover";
import { CopilotUIMessage } from "@/wab/client/components/copilot/useCopilotChat";
import {
  DefaultChatMessageProps,
  PlasmicChatMessage,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicChatMessage";
import { unreachable } from "@/wab/shared/common";
import { COPILOT_TOOL_DEFS } from "@/wab/shared/copilot/enterprise/copilot-tools";
import { ReasoningUIPart, ToolUIPart, isDataUIPart, isToolUIPart } from "ai";
import * as React from "react";

export type ChatMessageProps = DefaultChatMessageProps & {
  message: CopilotUIMessage;
};

function getThinkingLabel(text: string): string {
  const thinkingHeadline = text.split("\n")[0].replaceAll("**", "").trim();

  if (thinkingHeadline.length > 80) {
    return thinkingHeadline.slice(0, 80) + "...";
  }
  return thinkingHeadline;
}

function renderReasoningPart(part: ReasoningUIPart) {
  if (!part.text.trim()) {
    return null;
  }

  const isDone = part.state === "done";
  const label = getThinkingLabel(part.text);
  return (
    <MessagePartWithPopover
      label={label}
      state={isDone ? "done" : "loading"}
      popoverTitle={label}
      popoverContent={
        <MessagePartPopoverContentBlock title="Reasoning" content={part.text} />
      }
    />
  );
}

function renderToolPart(part: ToolUIPart) {
  const toolName = part.type.replace(
    /^tool-/,
    ""
  ) as keyof typeof COPILOT_TOOL_DEFS;
  const title = COPILOT_TOOL_DEFS[toolName]?.title ?? toolName;

  const isLoading =
    part.state === "input-streaming" || part.state === "input-available";
  const isError = part.state === "output-error";

  const output = part.state === "output-available" ? part.output : undefined;
  const errorText = isError ? part.errorText : undefined;

  return (
    <MessagePartWithPopover
      label={title}
      state={isLoading ? "loading" : isError ? "error" : "done"}
      popoverTitle={title}
      popoverContent={
        <>
          <MessagePartPopoverContentBlock
            title="Input"
            content={JSON.stringify(part.input, null, 2)}
          />
          {(output !== undefined || errorText) && (
            <MessagePartPopoverContentBlock
              title={errorText ? "Error" : "Output"}
              content={
                errorText ??
                (typeof output === "string"
                  ? output
                  : JSON.stringify(output, null, 2))
              }
            />
          )}
        </>
      }
    />
  );
}

export function ChatMessage(props: ChatMessageProps) {
  const { message, ...plasmicProps } = props;

  if (message.role === "system") {
    return null;
  }

  const responseSlot = message.parts.map((part) => {
    switch (part.type) {
      case "text":
        return part.text || null;
      case "reasoning":
        return renderReasoningPart(part);
      case "dynamic-tool":
      case "file":
      case "source-document":
      case "source-url":
      case "step-start":
        return null;
      default: {
        if (isToolUIPart(part)) {
          return renderToolPart(part);
        }
        if (isDataUIPart(part)) {
          return null;
        }

        unreachable(part);
      }
    }
  });

  return (
    <PlasmicChatMessage
      {...plasmicProps}
      type={message.role}
      responseSlot={responseSlot}
    />
  );
}
