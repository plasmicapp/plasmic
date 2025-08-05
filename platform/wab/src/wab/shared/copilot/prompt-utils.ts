import { tokenTypes } from "@/wab/commons/StyleToken";
import { CopilotImage, CopilotToken } from "@/wab/shared/ApiSchema";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import GPT3Tokenizer from "gpt3-tokenizer";
import OpenAI from "openai";
import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionRole,
} from "openai/resources/chat/completions";
import { ResponseCreateParamsBase } from "openai/resources/responses/responses";
import { z } from "zod";

export interface Issue {
  message: string;
  /** Default is warning, meaning non-fatal - e.g. an unexpected extra prop */
  severity?: "error" | "warning";
  /** If there's an actual Error associated with this */
  error?: string[];
  /** If there is other data */
  details?: any;
}

export const mdCode = (content: string, lang: string) =>
  "```" + lang + "\n" + content + "\n```";
export const humanJson = (x: any) => mdCode(JSON.stringify(x, null, 2), "");
export const json = (x: any) => mdCode(JSON.stringify(x), "");
export const nakedJson = (x: any) => JSON.stringify(x, null, 2);
export const typescript = (x: string) => mdCode(x, "ts");

export type CreateChatCompletionRequest =
  ChatCompletionCreateParamsNonStreaming;

export type CreateChatCompletionRequestOptions = OpenAI.RequestOptions;

export type ChatCompletionRequestMessageRoleEnum = ChatCompletionRole;

export function showCompletionRequest(
  createChatCompletionRequest: CreateChatCompletionRequest
) {
  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  const encoded: { bpe: number[]; text: string[] } = tokenizer.encode(
    createChatCompletionRequest.messages.map((m) => m.content).join("")
  );

  const chat = createChatCompletionRequest.messages
    .map((x) => "=== " + x.role + " ===\n" + x.content)
    .join("\n\n");
  return `
Tokens: ${encoded.bpe.length}

${chat}
`.trim();
}

export type WholeChatCompletionResponse = ChatCompletion;

export interface ModelInteraction {
  request: Promise<CreateChatCompletionRequest>;
  intermediateRequests: Promise<
    {
      previousResponse: WholeChatCompletionResponse;
      followUpRequest: CreateChatCompletionRequest;
    }[]
  >;
  response: Promise<WholeChatCompletionResponse>;
}

export interface CopilotCodeChainProps {
  currentCode: string | undefined;
  // Stringify-able data
  data: Record<string, any>;
  context?: string;
  executeRequest: (
    request: CreateChatCompletionRequest
  ) => Promise<WholeChatCompletionResponse>;
  goal: string;
}

export interface CopilotSqlCodeChainProps {
  currentCode: string | undefined;
  // Stringify-able data
  data: Record<string, any>;
  dataSourceSchema: DataSourceSchema;
  executeRequest: (
    request: CreateChatCompletionRequest
  ) => Promise<WholeChatCompletionResponse>;
  goal: string;
}

export type LLMParseResponsesRequest = ResponseCreateParamsBase;

export interface CopilotUiChainProps {
  goal: string;
  images?: Array<CopilotImage>;
  tokens?: CopilotToken[];
  isPublicMode?: boolean;
}

// Structured Response schemas
const CopilotUiGenerateHtmlActionSchema = z.object({
  name: z.literal("insert-html"),
  data: z.object({
    html: z.string(),
  }),
});

const CopilotUiTokenActionSchema = z.object({
  name: z.literal("add-token"),
  data: z.object({
    tokenType: z.enum(tokenTypes),
    name: z
      .string()
      .describe(
        "A unique token name. Make sure it's in the format of existing tokens if available"
      ),
    value: z
      .string()
      .describe("Token value including unit such as 10px, 1.5rem, #fff123 etc"),
  }),
});

export const CopilotUiActionsSchema = z.object({
  actions: z.array(
    z.union([CopilotUiGenerateHtmlActionSchema, CopilotUiTokenActionSchema])
  ),
});

export type CopilotUiActions = z.infer<typeof CopilotUiActionsSchema>;
