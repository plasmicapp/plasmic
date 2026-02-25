import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { serializeCopilotError } from "@/wab/client/frame-ctx/host-frame-api";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { CopilotPrompt } from "@/wab/client/studio-ctx/StudioCtx";
import {
  ProjectId,
  QueryCopilotChatUiStreamRequest,
} from "@/wab/shared/ApiSchema";
import { spawn } from "@/wab/shared/common";
import { fixJson } from "@/wab/shared/copilot/fix-json";
import { COPILOT_COMMANDS } from "@/wab/shared/copilot/internal/commands";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  UIDataTypes,
  UIMessage,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import * as React from "react";
import { z } from "zod";

/**
 * Maps COPILOT_COMMANDS to the UITools shape expected by UIMessage.
 * This lets useChat<CopilotUIMessage> fully type onToolCall and addToolOutput
 */
type CopilotUITools = {
  [K in keyof typeof COPILOT_COMMANDS]: {
    input: z.infer<(typeof COPILOT_COMMANDS)[K]["inputSchema"]>;
    output: string;
  };
};

/** Type-safe UIMessage with custom tools for copilot chat */
export type CopilotUIMessage = UIMessage<unknown, UIDataTypes, CopilotUITools>;

export function useCopilotChat({ projectId }: { projectId: ProjectId }) {
  const appCtx = useAppCtx();
  const { hostFrameApi } = useTopFrameCtx();
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
  const { messages, sendMessage, addToolOutput } = useChat<CopilotUIMessage>({
    transport,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic) {
        // Dynamic tools are the ones where the input and output types are not known at compile time.
        // https://ai-sdk.dev/docs/reference/ai-sdk-core/dynamic-tool
        // We don't have any dynamic tools, all our tools are defined statically.
        return;
      }

      const toolName = toolCall.toolName;
      const toolInput = toolCall.input;

      try {
        const result = await hostFrameApi.executeCopilotToolCall(
          toolName,
          toolInput
        );

        if (result.success) {
          spawn(
            addToolOutput({
              tool: toolName,
              toolCallId: toolCall.toolCallId,
              output: result.output,
            })
          );
        } else {
          spawn(
            addToolOutput({
              state: "output-error",
              tool: toolName,
              toolCallId: toolCall.toolCallId,
              errorText: serializeCopilotError(result.error),
            })
          );
        }
      } catch (err) {
        // Comlink or host-frame error — report as tool error.
        spawn(
          addToolOutput({
            state: "output-error",
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            errorText: serializeCopilotError(err),
          })
        );
      }
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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
