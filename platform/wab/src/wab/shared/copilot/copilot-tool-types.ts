import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { jsonToXml } from "@/wab/shared/web-exporter/json-to-xml";
import { zodSchema, type JSONSchema7 } from "ai";
import { z } from "zod";

/** Serialization format an AI agent prefers for copilot tool output. */
export type AiOutputFormat = "json" | "xml";

export type CopilotToolMeta<
  TInput extends
    | JSONSchema7
    | z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  TOutput extends JSONSchema7 | z.ZodTypeAny = z.ZodTypeAny
> = {
  /** Unique name, used as both tool ID and AI tool name */
  toolName: string;
  /** Human-readable title for the tool */
  title: string;
  /** Used in the AI tool schema */
  description: string;
  /** Schema for input, defines AI tool params */
  inputSchema: TInput;
  /** Schema the tool's output is validated against and serialized from */
  outputSchema: TOutput;
};

export type CopilotTool<
  TInput extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  TOutput extends z.ZodTypeAny = z.ZodTypeAny
> = CopilotToolMeta<TInput, TOutput> & {
  /**
   * Execute the tool, returning the serialized output in the agent's preferred
   * format. Throws on error. `opts.prettify` indents the output (default false);
   * handy for readable test snapshots.
   */
  execute: (
    studioCtx: StudioCtx,
    input: z.infer<TInput>,
    opts?: { prettify?: boolean }
  ) => Promise<string>;
};

/**
 * Helper to define a CopilotTool so the execute function's input and output are
 * fully typed. The authored execute returns the typed output model; the wrapper
 * validates it against `outputSchema` and serializes it to the format the agent
 * prefers.
 */
export function defineCopilotTool<
  TInput extends z.ZodObject<z.ZodRawShape>,
  TOutput extends z.ZodTypeAny
>(
  meta: CopilotToolMeta<TInput, TOutput>,
  execute: (
    studioCtx: StudioCtx,
    input: z.infer<TInput>
  ) => Promise<z.infer<TOutput>>
): CopilotTool<TInput, TOutput> {
  return {
    ...meta,
    execute: async (studioCtx, input, opts) => {
      const prettify = opts?.prettify ?? false;
      const output = meta.outputSchema.parse(await execute(studioCtx, input));
      return studioCtx.preferredAiOutputFormat() === "xml"
        ? jsonToXml(output, prettify)
        : JSON.stringify(output, null, prettify ? 2 : undefined);
    },
  };
}

/**
 * Convert Copilot tool definitions from Zod schemas to JSON Schema, for both
 * input (AI tool params) and output (introspectable result shape).
 */
export function mapCopilotToolsToJsonSchema(
  tools: Record<string, CopilotToolMeta>
): Record<string, CopilotToolMeta<JSONSchema7, JSONSchema7>> {
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
        outputSchema: zodSchema(tool.outputSchema).jsonSchema as JSONSchema7,
      },
    ])
  );
}
