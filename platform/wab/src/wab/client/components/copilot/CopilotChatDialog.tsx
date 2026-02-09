import { ChatMessage } from "@/wab/client/components/copilot/ChatMessage";
import { useCopilotChat } from "@/wab/client/components/copilot/useCopilotChat";
import {
  DefaultCopilotChatDialogProps,
  PlasmicCopilotChatDialog,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotChatDialog";
import { isSubmitKeyCombo } from "@/wab/client/shortcuts/shortcut";
import { ProjectId } from "@/wab/shared/ApiSchema";
import * as React from "react";

export interface CopilotChatDialogProps extends DefaultCopilotChatDialogProps {
  projectId: ProjectId;
  onClose: () => void;
}

export function CopilotChatDialog({
  projectId,
  onClose,
  ...props
}: CopilotChatDialogProps) {
  const {
    messages,
    submitCopilotPrompt,
    copilotPrompt,
    setCopilotPrompt,
    isValidPrompt,
  } = useCopilotChat({
    projectId,
  });

  return (
    <div className="CopilotChatDialogContainer">
      <PlasmicCopilotChatDialog
        {...props}
        closeBtn={{
          onClick: onClose,
        }}
        copilotPromptInput={{
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
          textAreaInput: {
            value: copilotPrompt.prompt,
            rows: 1,
            autoFocus: true,
            onChange: (value) =>
              setCopilotPrompt({
                ...copilotPrompt,
                // onChange value is typed as string, but it's initially value triggered as undefined.
                prompt: value ?? "",
              }),
            onKeyDown: async (e) => {
              if (isValidPrompt && isSubmitKeyCombo(e)) {
                e.preventDefault();

                await submitCopilotPrompt();
              }
            },
          },
        }}
        chatContent={{
          wrapChildren: () =>
            messages.map((message) => {
              return <ChatMessage message={message} />;
            }),
        }}
      />
    </div>
  );
}
