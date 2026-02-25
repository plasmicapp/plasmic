import { CopilotUIMessage } from "@/wab/client/components/copilot/useCopilotChat";
import {
  DefaultChatMessageProps,
  PlasmicChatMessage,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicChatMessage";
import { unreachable } from "@/wab/shared/common";
import { COPILOT_COMMANDS } from "@/wab/shared/copilot/internal/commands";
import { isDataUIPart, isToolUIPart } from "ai";
import * as React from "react";

export type ChatMessageProps = DefaultChatMessageProps & {
  message: CopilotUIMessage;
};

export function ChatMessage(props: ChatMessageProps) {
  const { message, ...plasmicProps } = props;

  if (message.role === "system") {
    return null;
  }

  const responseSlot = message.parts.map((part, i) => {
    switch (part.type) {
      case "text":
        return part.text;
      case "dynamic-tool":
      case "file":
      case "source-document":
      case "reasoning":
      case "source-url":
      case "step-start":
        return null;
      default: {
        if (isToolUIPart(part)) {
          const toolName = part.type.replace(
            /^tool-/,
            ""
          ) as keyof typeof COPILOT_COMMANDS;
          const title = COPILOT_COMMANDS[toolName].title ?? toolName;
          const isLoading =
            part.state === "input-streaming" ||
            part.state === "input-available";
          const isError = part.state === "output-error";

          // TODO: This UI is temporarily added to complete the functionality; we should
          // add a ToolMessage component in the Studio to render Tool in different state
          return (
            <span key={i}>
              {isLoading && `Running ${title}...`}
              {part.state === "output-available" && `${title} — done`}
              {isError && `${title} — error: ${part.errorText}`}
            </span>
          );
        } else if (isDataUIPart(part)) {
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
