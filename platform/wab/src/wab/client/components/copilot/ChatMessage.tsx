import {
  DefaultChatMessageProps,
  PlasmicChatMessage,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicChatMessage";
import { unreachable } from "@/wab/shared/common";
import { UIMessage, isDataUIPart, isToolUIPart } from "ai";
import * as React from "react";

export type ChatMessageProps = DefaultChatMessageProps & {
  message: UIMessage;
};

export function ChatMessage(props: ChatMessageProps) {
  const { message, ...plasmicProps } = props;

  if (message.role === "system") {
    return null;
  }

  const responseSlot = message.parts.map((part) => {
    // We only handle text part for now to complete E2E chat integration
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
          return null;
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
