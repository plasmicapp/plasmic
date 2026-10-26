type BaseModelProviderOpts = {
  modelName: string;
  maxTokens: number;
  temperature: number;
  options?: {
    openai?: {
      reasoningEffort?: string;
    };
    google?: {
      mediaResolution?:
        | "MEDIA_RESOLUTION_LOW"
        | "MEDIA_RESOLUTION_MEDIUM"
        | "MEDIA_RESOLUTION_HIGH";
    };
  };
};

export type ModelProviderOpts =
  | (BaseModelProviderOpts & { provider: "Anthropic" | "OpenAI" })
  // `location` overrides `GOOGLE_VERTEX_LOCATION` or the `global` endpoint (VertexAnthropic).
  | (BaseModelProviderOpts & {
      provider: "Google" | "VertexAnthropic";
      location?: string;
    })
  // Model Garden models are served from their own regions, so there's no default/fallback
  | (BaseModelProviderOpts & {
      provider: "VertexModelGarden";
      location: string;
    });
