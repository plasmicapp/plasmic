export type Provider = "Anthropic" | "OpenAI";

export type ModelProviderOpts = {
  provider: Provider;
  modelName: string;
  maxTokens: number;
  options?: {
    openai?: {
      reasoningEffort?: string;
    };
  };
};
