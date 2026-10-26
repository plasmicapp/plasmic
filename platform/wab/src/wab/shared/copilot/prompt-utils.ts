import { ArenaRef, arenaTypes } from "@/wab/shared/ApiSchema";
import { UIMessage } from "ai";
import { z } from "zod";

/**
 * Props for streaming chat with copilot.
 * Messages should be in UIMessage[] format from @ai-sdk/react useChat hook.
 */
export interface CopilotChat {
  messages: UIMessage[];
}

export const copilotMessageMetadataSchema = z.object({
  /** The arena open in Studio when the user sent the message. */
  currentArena: z
    .object({
      type: z.enum(arenaTypes),
      name: z.string(),
      componentUuids: z.array(z.string()),
    })
    .optional() satisfies z.ZodType<ArenaRef | undefined>,
  /** The model that wrote an assistant message. The server picks it. */
  model: z.string().optional(),
});

export type CopilotMessageMetadata = z.infer<
  typeof copilotMessageMetadataSchema
>;
