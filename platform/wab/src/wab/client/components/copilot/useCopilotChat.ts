import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { CopilotPrompt } from "@/wab/client/studio-ctx/StudioCtx";
import {
  ProjectId,
  QueryCopilotChatUiStreamRequest,
} from "@/wab/shared/ApiSchema";
import { fixJson } from "@/wab/shared/copilot/fix-json";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import * as React from "react";

interface UseCopilotChatProps {
  projectId: ProjectId;
}

export function useCopilotChat({ projectId }: UseCopilotChatProps) {
  const appCtx = useAppCtx();
  const [copilotPrompt, setCopilotPrompt] = React.useState<CopilotPrompt>({
    prompt: "",
    images: [],
    modelProviderOverride: "",
    copilotSystemPromptOverride: "",
  });

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        credentials: "include",
        prepareSendMessagesRequest: async ({ headers, body, ...options }) => {
          const apiHeaders = await appCtx.api.headers();

          return {
            ...options,
            api: `/api/v1/copilot/chat`,
            body: {
              ...body,
              messages: options.messages,
            },
            headers: {
              ...headers,
              ...apiHeaders,
            },
          };
        },
      }),
    []
  );
  const { messages, sendMessage } = useChat({
    transport,
  });

  const submitCopilotPrompt = async () => {
    const { prompt, modelProviderOverride, copilotSystemPromptOverride } =
      copilotPrompt;

    const reqPayload: QueryCopilotChatUiStreamRequest = {
      type: "chat-ui",
      projectId,
      // messages are passed in `prepareSendMessagesRequest` using `options.messages` populated by
      // useChat automatically with proper message ids when sendMessage is called for new message
      messages: [],
    };

    if (modelProviderOverride) {
      reqPayload.modelProviderOverride = JSON.parse(
        fixJson(modelProviderOverride)
      );
    }
    if (copilotSystemPromptOverride) {
      reqPayload.copilotSystemPromptOverride = copilotSystemPromptOverride;
    }

    setCopilotPrompt({
      prompt: "",
      images: [],
      modelProviderOverride: "",
      copilotSystemPromptOverride: "",
    });

    // This triggers the API call to fetch the assistant's response.
    await sendMessage(
      {
        text: prompt,
      },
      {
        body: reqPayload,
      }
    );
  };

  return {
    copilotPrompt,
    isValidPrompt: copilotPrompt.prompt.trim(),
    setCopilotPrompt,
    messages,
    sendMessage,
    submitCopilotPrompt,
  };
}
