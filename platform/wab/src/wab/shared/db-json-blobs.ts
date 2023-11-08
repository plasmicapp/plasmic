export interface CodeSandboxInfo {
  id: string;
  code: {
    lang: "ts";
    scheme: "blackbox" | "direct";
  };
}

export interface WebhookHeader {
  key: string;
  value: string;
}
