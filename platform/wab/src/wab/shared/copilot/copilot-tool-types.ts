import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { z } from "zod";

export interface CopilotTool<
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
> {
  /** Unique name, used as both tool ID and AI tool name */
  toolName: string;
  /** Human-readable title for the tool */
  title: string;
  /** Used in the AI tool schema */
  description: string;
  /** Zod schema for input, defines AI tool params */
  inputSchema: TSchema;
  /** Execute the tool. Returns a success message string. Throws on error. */
  execute: (studioCtx: StudioCtx, input: z.infer<TSchema>) => Promise<string>;
}

/** Helper function to define a CopilotTool so that the execute function input can be fully typed */
export function defineCopilotTool<TSchema extends z.ZodObject<z.ZodRawShape>>(
  meta: Omit<CopilotTool<TSchema>, "execute">,
  execute: CopilotTool<TSchema>["execute"]
): CopilotTool<TSchema> {
  return { ...meta, execute };
}
