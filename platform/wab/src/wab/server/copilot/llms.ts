/**
 * Wrappers around LLM APIs. Currently just for caching and simple logging.
 */

import { last, mkShortId } from "@/wab/shared/common";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { getAnthropicApiKey, getOpenaiApiKey } from "@/wab/server/secrets";
import { DynamoDbCache, SimpleCache } from "@/wab/server/simple-cache";
import { showCompletionRequest } from "@/wab/shared/copilot/prompt-utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import axios from "axios";
import { createHash } from "crypto";
import { pick } from "lodash";
import {
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from "openai";
import { stringify } from "safe-stable-stringify";

export const chatGptDefaultPrompt = `You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.`;

const openaiApiKey = getOpenaiApiKey();
const openaiRaw = new OpenAIApi(
  new Configuration({
    apiKey: openaiApiKey,
  })
);

const anthropicApiKey = getAnthropicApiKey();

const verbose = false;

const hash = (x: string) => createHash("sha256").update(x).digest("hex");

export class OpenAIWrapper {
  constructor(private openai: OpenAIApi, private cache: SimpleCache) {}

  createChatCompletion: OpenAIApi["createChatCompletion"] = async (
    createChatCompletionRequest,
    options
  ) => {
    if (verbose) {
      console.log(showCompletionRequest(createChatCompletionRequest));
    }
    const key = hash(
      JSON.stringify([
        "OpenAI.createChatCompletion",
        createChatCompletionRequest,
        options,
      ])
    );
    const value = await this.cache.get(key);
    if (value) {
      return JSON.parse(value);
    }
    const result = pick(
      await this.openai.createChatCompletion(
        createChatCompletionRequest,
        options
      ),
      "data"
    );
    const value1 = stringify(result);
    await this.cache.put(key, value1);
    return JSON.parse(value1);
  };
}

export interface ClaudeAIResponse {
  completion: string;
  stop: string;
  stop_reason: "stop_sequence" | "max_tokens";
  truncated: boolean;
  log_id: string;
  model: string;
  exception?: string;
}

function openAIToAnthropicRole(role: ChatCompletionRequestMessageRoleEnum) {
  if (role === "assistant") {
    return "Assistant" as const;
  }
  return "Human" as const;
}

function anthropicToOpenAIStopReason(reason: "stop_sequence" | "max_tokens") {
  return reason === "max_tokens" ? ("length" as const) : ("stop" as const);
}

export class AnthropicWrapper {
  constructor(private cache: SimpleCache) {}

  createChatCompletion: OpenAIApi["createChatCompletion"] = async (
    createChatCompletionRequest,
    options
  ) => {
    if (verbose) {
      console.log(showCompletionRequest(createChatCompletionRequest));
    }
    const key = hash(
      JSON.stringify([
        "Anthropic.createChatCompletion",
        createChatCompletionRequest,
        options,
      ])
    );
    const value = await this.cache.get(key);
    if (value) {
      return JSON.parse(value);
    }

    const prompt =
      createChatCompletionRequest.messages
        .map(
          (message) =>
            `${openAIToAnthropicRole(message.role)}: ${message.content}`
        )
        .join("\n\n") + "\n\nAssistant:";
    const data = {
      prompt,
      model: "claude-v1",
      max_tokens_to_sample: createChatCompletionRequest.max_tokens ?? 5000,
      stop_sequences: ["\n\nHuman:"],
      temperature: createChatCompletionRequest.temperature,
    };

    try {
      const response = await axios.post<ClaudeAIResponse>(
        "https://api.anthropic.com/v1/complete",
        data,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": anthropicApiKey,
          },
        }
      );
      const adaptedResponse = {
        id: `chatcmpl-${mkShortId()}`,
        object: "chat.completion.chunk",
        created: -1,
        model: "gpt-3.5-turbo-0301",
        usage: {
          prompt_tokens: 0,
          completion_tokens: -1, // TODO: Not possible to know number of tokens?
          total_tokens: -1,
        },
        choices: [
          {
            message: {
              role: "assistant",
              content: last(response.data.completion.split("\n\nAssistant:")),
            },
            index: 0,
            ...(response.data.stop_reason
              ? {
                  finish_reason: anthropicToOpenAIStopReason(
                    response.data.stop_reason
                  ),
                }
              : {}),
          },
        ],
      };
      const result = {
        data: adaptedResponse,
      };
      const value1 = stringify(result);
      await this.cache.put(key, value1);
      return JSON.parse(value1);
    } catch (error) {
      console.error("Error getting chat completions:", error);
      throw error;
    }
  };
}

export const createOpenAIClient = (dbMgr?: DbMgr) =>
  new OpenAIWrapper(
    openaiRaw,
    new DynamoDbCache(
      new DynamoDBClient({
        region: "us-west-2",
      })
    )
  );

export const createAnthropicClient = (dbMgr?: DbMgr) =>
  new AnthropicWrapper(
    new DynamoDbCache(
      new DynamoDBClient({
        region: "us-west-2",
      })
    )
  );
