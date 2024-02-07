// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { OpenAIWrapper } from "@/wab/server/copilot/llms";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import GPT3Tokenizer from "gpt3-tokenizer";
import { CreateChatCompletionRequest } from "openai";

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

export type WholeChatCompletionResponse = Pick<
  Awaited<ReturnType<OpenAIWrapper["createChatCompletion"]>>,
  "data"
>;

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
