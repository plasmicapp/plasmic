import {
  isAnonymousQuotaReached,
  isGenerationComplete,
} from "@/wab/client/components/copilot/anonymous-chat";
import {
  ANONYMOUS_CHAT_USER_ID,
  saveCopilotChat,
} from "@/wab/client/components/copilot/enterprise/chat-storage";
import type { CopilotUIMessage } from "@/wab/client/components/copilot/enterprise/useCopilotChat";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { IDBFactory } from "fake-indexeddb";

const PROJECT_ID = "project-1" as ProjectId;

const userMessage: CopilotUIMessage = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: "add a hero", state: "done" }],
};
const answer: CopilotUIMessage = {
  id: "m2",
  role: "assistant",
  parts: [{ type: "text", text: "Done", state: "done" }],
};
const pendingToolCall: CopilotUIMessage = {
  id: "m3",
  role: "assistant",
  parts: [
    {
      type: "tool-read",
      toolCallId: "call-1",
      state: "output-available",
      input: {},
      output: "",
    },
  ],
};

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("isGenerationComplete", () => {
  it("is false while the user is waiting for an answer", () => {
    expect(isGenerationComplete([userMessage])).toEqual(false);
  });

  it("is false while a tool round-trip is pending", () => {
    expect(isGenerationComplete([userMessage, pendingToolCall])).toEqual(false);
  });

  it("is true once the assistant has answered", () => {
    expect(isGenerationComplete([userMessage, answer])).toEqual(true);
  });
});

describe("isAnonymousQuotaReached", () => {
  it("is not reached without a stored anonymous chat", async () => {
    expect(await isAnonymousQuotaReached(PROJECT_ID)).toEqual(false);
  });

  it("is reached once the stored anonymous chat has an answer", async () => {
    await saveCopilotChat({
      chatId: "chat-1",
      userId: ANONYMOUS_CHAT_USER_ID,
      projectId: PROJECT_ID,
      updatedAt: 1,
      messages: [userMessage, answer],
    });
    expect(await isAnonymousQuotaReached(PROJECT_ID)).toEqual(true);
  });
});
