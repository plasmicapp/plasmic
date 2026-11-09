import { ArenaRef, TeamId, arenaTypes } from "@/wab/shared/ApiSchema";
import { zOpaqueString } from "@/wab/shared/utils/zod-utils";
import { UIMessage } from "ai";
import { z } from "zod";

/**
 * Props for streaming chat with copilot.
 * Messages should be in UIMessage[] format from @ai-sdk/react useChat hook.
 */
export interface CopilotChat {
  messages: UIMessage[];
}

export const copilotChatQuotaSchema = z.object({
  /** Null for the daily free limit of each user. */
  baseTeamId: zOpaqueString<TeamId>().nullable(),
  baseResetInterval: z.enum(["day", "month"]),
  /** ISO instant. */
  baseResetsAt: z.string(),
  baseLimit: z.number(),
  baseUsed: z.number(),
});

export type CopilotChatQuota = z.infer<typeof copilotChatQuotaSchema>;

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
  /** Quota after this reply. Null without a limit, like on paid plans. */
  quota: copilotChatQuotaSchema.nullable().optional(),
});

export type CopilotMessageMetadata = z.infer<
  typeof copilotMessageMetadataSchema
>;
