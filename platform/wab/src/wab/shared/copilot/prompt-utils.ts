// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { CopilotImage } from "@/wab/shared/ApiSchema";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import GPT3Tokenizer from "gpt3-tokenizer";
import OpenAI from "openai";
import {
  ChatCompletion,
  ChatCompletionContentPartImage,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionRole,
} from "openai/resources/chat/completions";

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

export type ChatCompletionRequestContentPartImage =
  ChatCompletionContentPartImage;

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

export interface CopilotUiChainProps {
  images: Array<CopilotImage>;
  executeRequest: (
    request: CreateChatCompletionRequest
  ) => Promise<WholeChatCompletionResponse>;
  goal: string;
}
