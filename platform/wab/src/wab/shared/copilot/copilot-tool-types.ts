import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { zodSchema, type JSONSchema7 } from "ai";
import { z } from "zod";

type CopilotToolMeta<S extends JSONSchema7 | z.ZodObject<z.ZodRawShape>> = {
  /** Unique name, used as both tool ID and AI tool name */
  toolName: string;
  /** Human-readable title for the tool */
  title: string;
  /** Used in the AI tool schema */
  description: string;
  /** Schema for input, defines AI tool params */
  inputSchema: S;
};

export type CopilotTool<
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
> = CopilotToolMeta<TSchema> & {
  /** Execute the tool. Returns a success message string. Throws on error. */
  execute: (studioCtx: StudioCtx, input: z.infer<TSchema>) => Promise<string>;
};

/** Helper function to define a CopilotTool so that the execute function input can be fully typed */
export function defineCopilotTool<TSchema extends z.ZodObject<z.ZodRawShape>>(
  meta: CopilotToolMeta<TSchema>,
  execute: CopilotTool<TSchema>["execute"]
): CopilotTool<TSchema> {
  return { ...meta, execute };
}

/**
 * Convert Copilot tool definitions from Zod input schemas to JSON Schema.
 */
export function mapCopilotToolsToJsonSchema(
  tools: Record<string, CopilotToolMeta<z.ZodObject<z.ZodRawShape>>>
): Record<string, CopilotToolMeta<JSONSchema7>> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        // Key off the tools key, which is the name tools are invoked by, so
        // it is aligned with the callable tools even if a def's `toolName`
        // field ever diverges from its key.
        toolName: name,
        title: tool.title,
        description: tool.description,
        // Schema.jsonSchema is JSONSchema7 | PromiseLike<JSONSchema7> to cover
        // async/raw JSON-schema sources, but zodSchema() always builds it
        // synchronously, so it is a JSONSchema7 here.
        inputSchema: zodSchema(tool.inputSchema).jsonSchema as JSONSchema7,
      },
    ])
  );
}
